function capitalizeWords(str) {
  return str
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}


function inferSemanticType(element, elements) {
  if (element.type === "rectangulo") {
    const nearbyText = elements.find(e =>
      e.type === "texto" &&
      Math.abs(e.x - element.x) < 20 &&
      Math.abs(e.y - element.y) < 20 &&
      e.width <= element.width + 10 &&
      e.height <= element.height + 10
    );
    if (nearbyText) return "button";

    const label = elements.find(e =>
      e.type === "texto" &&
      e.x >= element.x - 50 &&
      e.x <= element.x + element.width + 50 &&
      e.y >= element.y - 50 &&
      e.y <= element.y + element.height + 20
    );
    if (label && ["username", "password", "correo", "email"].some(t =>
      label.text?.toLowerCase().includes(t)
    )) return "input";

    const sameY = elements.filter(e =>
      e.type === "rectangulo" &&
      e.id !== element.id &&
      Math.abs(e.y - element.y) < 10
    );
    if (sameY.length >= 2) return "table-row";

    if (
      element.width >= 20 && element.width <= 40 &&
      element.height >= 20 && element.height <= 40 &&
      element.borderColor &&
      element.borderWidth >= 1 &&
      element.x < 100
    ) {
      return "checkbox";
    }
  }
  return null;
}

function groupTableRows(elements) {
  const rows = [];
  const visited = new Set();
  const threshold = 15;
  for (const el of elements) {
    if (el.semanticType === "table-row" && !visited.has(el.id)) {
      const rowY = el.y;
      const rowGroup = elements.filter(e =>
        e.semanticType === "table-row" &&
        Math.abs(e.y - rowY) < threshold
      );
      for (const r of rowGroup) visited.add(r.id);
      rows.push(rowGroup.sort((a, b) => a.x - b.x));
    }
  }
  return rows;
}

function generatePageHtmlAndScss(page) {
  let html = `<!-- HTML generado para ${page.name} -->\n<div class="page">\n`;
  let scss = `/* SCSS generado para ${page.name} */\n\n.page {\n  position: relative;\n  width: 100%;\n  height: 100%;\n}\n\n`;

  const enrichedElements = page.elements.map(el => ({
    ...el,
    semanticType: inferSemanticType(el, page.elements)
  }));

  const tableRows = groupTableRows(enrichedElements);
  const tableCells = new Set(tableRows.flat().map(e => e.id));

  if (tableRows.length > 0) {
    html += `  <table class="table-${page.id}">\n    <tbody>\n`;
    for (const row of tableRows) {
      html += `      <tr>\n`;
      for (const cell of row) {
        html += `        <td class="el-${cell.id}">${cell.text || ""}</td>\n`;
        let tdStyle = `.el-${cell.id} {\n  padding: 8px;\n  text-align: left;\n`;
        if (cell.color) tdStyle += `  background-color: ${cell.color};\n`;
        if (cell.textColor) tdStyle += `  color: ${cell.textColor};\n`;
        if (cell.borderColor) {
          tdStyle += `  border: ${cell.borderWidth || 1}px solid ${cell.borderColor};\n`;
        }
        tdStyle += `}\n\n`;
        scss += tdStyle;
      }
      html += `      </tr>\n`;
    }
    html += `    </tbody>\n  </table>\n`;
  }

  for (const element of enrichedElements) {
    if (tableCells.has(element.id)) continue;

    const className = `el-${element.id}`;

    if (element.semanticType === "button") {
      html += `  <button class="${className}">${element.text || "Botón"}</button>\n`;
      scss += `.${className} {\n  position: absolute;\n  top: ${element.y}px;\n  left: ${element.x}px;\n  width: ${element.width}px;\n  height: ${element.height}px;\n  background-color: ${element.color};\n  color: ${element.textColor};\n  border-radius: ${element.borderRadius}px;\n  border: none;\n  cursor: pointer;\n}\n\n`;
      continue;
    }

    if (element.semanticType === "input") {
      html += `  <input class="${className}" placeholder="${element.text || ""}" />\n`;
      scss += `.${className} {\n  position: absolute;\n  top: ${element.y}px;\n  left: ${element.x}px;\n  width: ${element.width}px;\n  height: ${element.height}px;\n  background-color: ${element.color};\n  border-radius: ${element.borderRadius}px;\n  padding: 8px;\n  border: 1px solid #ccc;\n}\n\n`;
      continue;
    }

    if (element.semanticType === "checkbox") {
      html += `  <input type="checkbox" class="${className}" />\n`;
      scss += `.${className} {\n  position: absolute;\n  top: ${element.y}px;\n  left: ${element.x}px;\n  width: ${element.width}px;\n  height: ${element.height}px;\n  border-radius: ${element.borderRadius}px;\n  border: ${element.borderWidth || 1}px solid ${element.borderColor};\n}\n\n`;
      continue;
    }

    html += `  <div class="${className}">\n`;

    if (element.type === "texto") {
      html += `    <p>${element.text || ""}</p>\n`;
    } else if (element.type === "imagen" || element.type === "icono") {
      html += `    <img src="${element.src}" alt="${element.alt || ""}" />\n`;
    } else if (element.type === "triangulo") {
      html += `    <!-- Triángulo decorativo -->\n`;
    }

    html += `  </div>\n`;

    let elementStyles = `.${className} {\n  position: absolute;\n  top: ${element.y}px;\n  left: ${element.x}px;\n`;

    if (element.type === "triangulo") {
      elementStyles += `  width: 0;\n  height: 0;\n  border-left: ${element.width / 2}px solid transparent;\n  border-right: ${element.width / 2}px solid transparent;\n  border-bottom: ${element.height}px solid ${element.color};\n  background-color: transparent;\n`;
    } else {
      elementStyles += `  width: ${element.width}px;\n  height: ${element.height}px;\n`;
    }

    if (element.color) elementStyles += `  background-color: ${element.color};\n`;
    if (element.textColor && element.type === "texto")
      elementStyles += `  color: ${element.textColor};\n`;
    if (element.borderRadius !== null && element.borderRadius !== undefined)
      elementStyles += `  border-radius: ${element.borderRadius}px;\n`;
    if (element.borderColor && (element.borderWidth !== null && element.borderWidth !== undefined))
      elementStyles += `  border: ${element.borderWidth}px solid ${element.borderColor};\n`;

    if (element.type === "imagen" || element.type === "icono") {
      elementStyles += `  overflow: hidden;\n\n  img {\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    border-radius: inherit;\n  }\n`;
    }

    elementStyles += `}\n\n`;
    scss += elementStyles;
  }

  html += `</div>\n`;
  return { html, scss };
}




function generateReadme(pages) {
  const routes = pages.map((p) => {
    const route = slugify(p.name);
    return "- `/" + route + "` → Página: " + p.name;
  });

  return "# 🧩 Generated Angular Design\n\n" +
    "Este diseño fue generado automáticamente por tu herramienta CASE.\n\n" +
    "## ✅ Requisitos\n\n" +
    "- Node.js 18+ y npm instalado\n" +
    "- Angular CLI instalado globalmente:\n" +
    "  ```bash\n" +
    "  npm install -g @angular/cli\n" +
    "  ```\n\n" +
    "## 🚀 Cómo usar este diseño en un proyecto Angular\n\n" +
    "### 1. Crear un nuevo proyecto Angular (si no tienes uno)\n\n" +
    "```bash\n" +
    "ng new nombre-del-proyecto --style=scss --routing\n" +
    "```\n\n" +
    "> 📌 Asegúrate de elegir **SCSS** como formato de estilos y habilitar el sistema de **rutas**.\n\n" +
    "---\n\n" +
    "### 2. Copiar los archivos generados\n\n" +
    "- Extrae el ZIP exportado.\n" +
    "- Copia la carpeta `generated-design/` dentro de `src/app/` de tu proyecto Angular.\n\n" +
    "Tu estructura debe quedar así:\n\n" +
    "```\n" +
    "src/\n" +
    "└── app/\n" +
    "    ├── generated-design/\n" +
    "    │   ├── page-login/\n" +
    "    │   ├── page-pagina-1/\n" +
    "    │   ├── generated-design.module.ts\n" +
    "    │   └── generated-design-routing.module.ts\n" +
    "    └── app.routes.ts\n" +
    "```\n\n" +
    "---\n\n" +
    "### 3. Registrar el módulo y las rutas generadas\n\n" +
    "#### Si usas Angular 17+ (app.routes.ts y app.config.ts)\n\n" +
    "```ts\n" +
    "import { Routes } from '@angular/router';\n" +
    "import { LoginComponent } from './generated-design/page-login/page-login.component';\n" +
    "import { Pagina1Component } from './generated-design/page-pagina-1/page-pagina-1.component';\n\n" +
    "export const routes: Routes = [\n" +
    "  { path: 'login', component: LoginComponent },\n" +
    "  { path: 'pagina-1', component: Pagina1Component },\n" +
    "  { path: '', redirectTo: 'login', pathMatch: 'full' }\n" +
    "];\n" +
    "```\n\n" +
    "- En `app.config.ts`:\n\n" +
    "```ts\n" +
    "import { provideRouter } from '@angular/router';\n" +
    "import { routes } from './app.routes';\n\n" +
    "export const appConfig = {\n" +
    "  providers: [provideRouter(routes)]\n" +
    "};\n" +
    "```\n\n" +
    "#### Si usas módulos tradicionales\n\n" +
    "- En `app.module.ts`:\n\n" +
    "```ts\n" +
    "import { GeneratedDesignModule } from './generated-design/generated-design.module';\n\n" +
    "@NgModule({\n" +
    "  imports: [GeneratedDesignModule],\n" +
    "})\n" +
    "export class AppModule {}\n" +
    "```\n\n" +
    "- En `app-routing.module.ts`:\n\n" +
    "```ts\n" +
    "import { GeneratedDesignRoutingModule } from './generated-design/generated-design-routing.module';\n\n" +
    "@NgModule({\n" +
    "  imports: [RouterModule.forRoot([]), GeneratedDesignRoutingModule],\n" +
    "})\n" +
    "export class AppRoutingModule {}\n" +
    "```\n\n" +
    "---\n\n" +
    "### 4. Limpiar la plantilla inicial\n\n" +
    "En `app.component.html`, deja solo:\n\n" +
    "```\n" +
    "<router-outlet></router-outlet>\n" +
    "```\n\n" +
    "---\n\n" +
    "## 🧭 Rutas disponibles\n\n" +
    routes.join("\n") + "\n\n" +
    "---\n\n" +
    "## 📝 Notas adicionales\n\n" +
    "- El diseño generado **no incluye lógica** (solo estructura visual).\n" +
    "- Puedes modificar los componentes libremente.\n" +
    "- Compatible con Angular 15, 16 y 17.\n\n" +
    "---\n\n" +
    "Generado automáticamente por tu herramienta CASE 🛠️";
}

module.exports = {
  capitalizeWords,
  slugify,
  generatePageHtmlAndScss,
  generateReadme
};