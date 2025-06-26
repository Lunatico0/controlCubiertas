# 🛞 ControlCubiertas

**ControlCubiertas** es una aplicación de escritorio moderna diseñada para gestionar el inventario, el mantenimiento y el estado de cubiertas de vehículos de forma visual, eficiente e intuitiva.

---

## 🚀 Características principales

- 🗃️ Gestión de inventario de cubiertas
- 🔍 Seguimiento del estado (nueva, recapada, descartada, etc.)
- 📄 Generación de reportes listos para imprimir
- 🔧 Historial de mantenimiento por cubierta
- 🔄 Actualizaciones automáticas con verificación desde GitHub
- 🌗 Modo claro / oscuro
- 🎨 Configuraciones personalizadas: colores por estado, tamaño de fuente, etc.

---

## 🧰 Tecnologías utilizadas

- **Electron** – entorno de escritorio multiplataforma
- **React** – interfaz de usuario
- **TailwindCSS** – estilos modernos y responsivos
- **Node.js + Express** – backend REST API
- **MongoDB** – base de datos NoSQL para almacenamiento

---

## 🖥️ Instalación local (modo desarrollo)

### 1. Clonar el repositorio

```bash
  git clone https://github.com/Lunatico0/controlCubiertas.git
  cd controlCubiertas
  ```
### 2. Instalar dependencias del backend
  ```bash
  cd backend
  npm install
  ```
### 3. Instalar dependencias del frontend
  ```bash
  cd ../frontend
  npm install
  ```

> ✅ Asegúrate de tener una instancia de **MongoDB** en ejecución si vas a usar funciones que dependen de la base de datos.

### 4. Configurar variables de entorno

Debés crear archivos `.env` tanto en el **backend** como en el **frontend**, según corresponda. Ejemplo:

**`backend/.env`**
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/controlcubiertas
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3001
```

---

## 🧪 Uso en desarrollo (Navegador)

#### 1. Iniciar el backend
  ```bash
  cd backend
  npm start
  ```
#### 2. Inicia el cliente:
  ```bash
  cd ../frontend
  npm start
  ```
#### 3. Accede a la aplicación en tu navegador en `http://localhost:8080`.

## 🧪 Uso en desarrollo (Desktop)

#### 1. Iniciar el servidor backend

```bash
cd backend
npm start
```

#### 2. Iniciar la app con Electron (modo escritorio)

En la raíz del proyecto:

```bash
npm run electron
```

> Esto lanzará la aplicación como app de escritorio con la UI de React renderizada dentro de Electron.

---

## 🛠️ Scripts útiles

| Comando                     | Descripción                                      |
|----------------------------|--------------------------------------------------|
| `npm run build`            | Compila React y crea el instalador (.exe)       |
| `npm run electron`         | Inicia Electron en modo desarrollo               |
| `npm run electron:start`   | Ejecuta directamente `main.js` con Electron     |
| `npm run build-react`      | Compila solo el frontend (React/Vite)           |
| `npm run build-desktop`    | Genera solo el build de escritorio (Electron)   |

---

## 📂 Estructura del proyecto

```
controlCubiertas/
├── backend/               # Servidor Express + MongoDB
├── frontend/              # UI hecha con React + Tailwind
├── desktop/               # Archivos de Electron (main.js, preload.js, etc)
├── .env                   # Variables de entorno raíz
├── package.json           # Scripts y configuración principal
└── dist/                  # Builds generados
```

---

## 🤝 Contribuir

##### Haz un fork del proyecto.
##### Crea una rama para tu funcionalidad:
  ```bash
  git checkout -b nueva-funcionalidad
  ```
##### Realiza tus cambios y haz un commit:
  ```bash
  git commit -m "Agrega nueva funcionalidad"
  ```
##### Envía tus cambios:
  ```bash
  git push origin nueva-funcionalidad
  ```
##### Abre un Pull Request 🙌

---

## 📬 Contacto

Si tienes preguntas o sugerencias, no dudes en contactarme en [pittanapatricio@gmail.com](mailto:pittanapatricio@gmail.com).

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
