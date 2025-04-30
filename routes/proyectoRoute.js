const express = require("express");
const router = express.Router();
const {
  getProyectos,
  createProyecto,
  deleteProyecto,
  updateProyecto,
  getProyectoById,
  exportProyectoAngular,
  getProyectoByLink,
  updateProyectoByLink,
} = require("../controllers/proyectoController");
const verifyToken = require("../middlewares/verifyToken");

router.get("/", verifyToken, getProyectos);
router.get("/:id", verifyToken, getProyectoById);
router.post("/", verifyToken, createProyecto);
router.delete("/:id", verifyToken, deleteProyecto);
router.put("/:id", verifyToken, updateProyecto);
router.get("/:id/export-angular", verifyToken, exportProyectoAngular);
router.get("/proyectos/link/:link", getProyectoByLink);
router.put("/proyectos/link/:link", updateProyectoByLink);


module.exports = router;
