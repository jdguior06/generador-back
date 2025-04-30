const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const { capitalizeWords, generatePageHtmlAndScss, generateReadme } = require("../utils/angularGenerator");
const crypto = require("crypto");

function generateUniqueLink() {
  return crypto.randomBytes(6).toString("hex");
}

const getProyectos = async (req, res) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(proyectos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProyectoById = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
    });
    res.json(proyecto);
  } catch (err) {
    res.status(404).json({ error: "Proyecto no encontrado" });
  }
};

const createProyecto = async (req, res) => {
  const { name, objetos } = req.body;
  try {
    const proyecto = await prisma.proyecto.create({
      data: {
        name,
        link: generateUniqueLink(),
        objetos,
        userId: req.userId,
      },
    });
    res.status(201).json(proyecto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteProyecto = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.proyecto.delete({
      where: { id },
    });
    res.json({ message: "Proyecto eliminado" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateProyecto = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, objetos } = req.body;

  try {
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(name && { name }),         
        ...(objetos && { objetos }),   
      },
    });
    res.json({ message: "Proyecto actualizado", proyecto });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateProyectoByLink = async (req, res) => {
  const { link } = req.params;
  const { objetos } = req.body;

  try {
    const proyecto = await prisma.proyecto.update({
      where: { link },
      data: { objetos },
    });

    res.json({ message: "Proyecto actualizado", proyecto });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getProyectoByLink = async (req, res) => {
  const { link } = req.params;

  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { link },
    });

    if (!proyecto) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }

    res.json(proyecto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const exportProyectoAngular = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const proyecto = await prisma.proyecto.findUnique({ where: { id } });
    if (!proyecto || !proyecto.objetos || !proyecto.objetos.pages) {
      return res.status(404).json({ error: "Proyecto o contenido no encontrado" });
    }

    const tempDir = path.join(__dirname, "../tmp/generated-design");
    await fs.emptyDir(tempDir);

    const pages = proyecto.objetos.pages;
    const componentImports = [];
    const componentDeclarations = [];
    const routes = [];

    for (const page of pages) {
      const nameKebab = page.name.toLowerCase().replace(/\s+/g, "-");
      const namePascal = capitalizeWords(page.name);
      const folder = path.join(tempDir, `page-${nameKebab}`);
      await fs.ensureDir(folder);

      const { html, scss } = generatePageHtmlAndScss(page);

      const ts = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-page-${nameKebab}',
  templateUrl: './page-${nameKebab}.component.html',
  styleUrls: ['./page-${nameKebab}.component.scss']
})
export class ${namePascal}Component {}
      `.trim();

      await fs.writeFile(path.join(folder, `page-${nameKebab}.component.html`), html);
      await fs.writeFile(path.join(folder, `page-${nameKebab}.component.scss`), scss);
      await fs.writeFile(path.join(folder, `page-${nameKebab}.component.ts`), ts);

      componentImports.push(`import { ${namePascal}Component } from './page-${nameKebab}/page-${nameKebab}.component';`);
      componentDeclarations.push(`${namePascal}Component`);
      routes.push(`{ path: '${nameKebab}', component: ${namePascal}Component }`);
    }

    // Archivo del módulo
    const moduleContent = `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
${componentImports.join("\n")}

@NgModule({
  declarations: [
    ${componentDeclarations.join(",\n    ")}
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ${componentDeclarations.join(",\n    ")}
  ]
})
export class GeneratedDesignModule {}
    `.trim();

    await fs.writeFile(path.join(tempDir, `generated-design.module.ts`), moduleContent);

    // Archivo del routing
    const routingModuleContent = `
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
${componentImports.join("\n")}

const routes: Routes = [
  ${routes.join(",\n  ")}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GeneratedDesignRoutingModule {}
    `.trim();

    await fs.writeFile(path.join(tempDir, `generated-design-routing.module.ts`), routingModuleContent);

    // Crear ZIP

    const readme = generateReadme(pages);
    await fs.writeFile(path.join(tempDir, "README.md"), readme);

    const indexHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${proyecto.name} - Navegación</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    h1 { color: #2c3e50; }
    ul { list-style: none; padding-left: 0; }
    li { margin: 0.5rem 0; }
    a { color: #007acc; text-decoration: none; font-weight: bold; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${proyecto.name}</h1>
  <p>Selecciona una página para visualizarla:</p>
  <ul>
    ${pages.map(p => {
      const route = p.name.toLowerCase().replace(/\s+/g, "-");
      return `<li><a href="/${route}" target="_blank">${p.name}</a></li>`;
    }).join("\n")}
  </ul>
</body>
</html>
`.trim();

    await fs.writeFile(path.join(tempDir, `index.html`), indexHtml);

    const zipPath = path.join(__dirname, `../tmp/generated-design.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      res.download(zipPath, "generated-design.zip", async () => {
        await fs.remove(tempDir);
        await fs.remove(zipPath);
      });
    });

    archive.on("error", err => { throw err; });

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();

  } catch (err) {
    console.error("Error al exportar proyecto:", err);
    res.status(500).json({ error: "Error al generar el código Angular" });
  }
};


module.exports = {
  getProyectos,
  getProyectoById,
  createProyecto,
  deleteProyecto,
  updateProyecto,
  getProyectoByLink,
  updateProyectoByLink,
  exportProyectoAngular,
};
