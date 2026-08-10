# SinGlutenpzo (Oriven) - Sistema de Gestión de Inventario y Ventas 🌾🍰✨

Este es un sistema completo de nivel empresarial para la gestión en tiempo real de inventarios, ventas, compras, deudas de proveedores, clientes, abonos, devoluciones y reportes financieros mensuales con exportación a PDF y Excel para **SinGlutenpzo (Oriven Distribuidora de Alimentos)** (Productos 100% Sin Gluten y Postres Saludables en Puerto Ordaz).

El sistema cuenta con una interfaz web pulida y moderna construida en React, integrada con un servidor backend Express que interactúa con Google Gemini para el procesamiento inteligente de documentos contables y facturas, y sincronizada en tiempo real con Firebase Firestore.

---

## 🚀 Características Principales

*   **📦 Gestión de Inventario en Tiempo Real**: Carga, edición y control de stock de harina, mezclas y postres sin gluten. Filtros avanzados por categoría, marca, estado y stock mínimo.
*   **🛒 Catálogo Digital para Clientes**: Vista interactiva del catálogo con carrito de compras y generación automática de pedidos enviados por WhatsApp.
*   **💼 Módulo de Ventas & Estado de Cuenta**: Registro de ventas a crédito o de contado. Historial de abonos recibidos con actualizaciones de deuda en tiempo real.
*   **💸 Gastos & Nómina**: Control completo de egresos clasificados en personal, servicios, alquileres y otros.
*   **🧾 Compras & Directorio de Proveedores**: Seguimiento de compras de mercancía a proveedores y deudas vigentes.
*   **🔄 Registro de Devoluciones**: Gestión de devoluciones con reajustes automatizados de inventario.
*   **📊 Dashboard & Reportes en PDF/Excel**: Generación automática de reportes financieros mensuales completos que consolidan ventas, ganancia líquida y egresos detallados, exportables en PDF profesional e informes en Excel.
*   **🧠 Asistente de Carga por IA (Google Gemini)**: Carga inteligente de compras, gastos, listas de clientes o proveedores mediante copiado y pegado de texto plano o subida de archivos (Excel/PDF), procesados por el modelo Gemini.
*   **✉️ Envío Automático de Facturas**: Integración con SMTP para enviar de forma automática la factura digital en formato HTML responsivo al correo del cliente con un solo clic.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Recharts.
*   **Backend**: Node.js, Express, TypeScript, Esbuild.
*   **Base de Datos**: Firebase Cloud Firestore (sincronización en tiempo real) & Firebase Authentication.
*   **IA**: `@google/genai` (Google Gemini SDK).
*   **Generación de Reportes**: `jspdf` para PDFs y `xlsx` para hojas de cálculo Excel.

---

## 📋 Requisitos Previos

Asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
*   [npm](https://www.npmjs.com/) o [bun](https://bun.sh/)

---

## ⚙️ Configuración del Entorno

1. Copia el archivo de variables de entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Llena las variables correspondientes en tu archivo `.env`:
   *   `GEMINI_API_KEY`: Tu clave de API de Google AI Studio para habilitar el procesamiento inteligente de documentos.
   *   `SMTP_HOST`: Servidor SMTP para envíos de correos (ej. `smtp.gmail.com`).
   *   `SMTP_PORT`: Puerto del servidor SMTP (ej. `587` para TLS o `465` para SSL).
   *   `SMTP_USER`: Tu correo emisor (ej. `facturas@singlutenpzo.com`).
   *   `SMTP_PASS`: Contraseña o clave de aplicación generada en tu proveedor de correo.

---

## 🧑‍💻 Instrucciones de Ejecución

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en entorno de desarrollo
```bash
npm run dev
```
La aplicación estará disponible localmente en `http://localhost:3000`.

### 3. Compilar para producción
```bash
npm run build
```

### 4. Iniciar el servidor en producción
```bash
npm run start
```

---

## 📝 Licencia

Este proyecto es para uso comercial exclusivo de **SinGlutenpzo (Oriven Distribuidora de Alimentos)**. Todos los derechos reservados © 2026.

