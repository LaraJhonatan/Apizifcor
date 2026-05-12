# 🚀 Nova Industria API - Instrucciones de Instalación

## 📋 Prerrequisitos

- Node.js 18+ instalado
- SQL Server 2019+ instalado (Express es suficiente para desarrollo)
- npm o yarn

## 🗄️ Configuración de SQL Server

### Opción 1: SQL Server Express (Recomendado para desarrollo local)

1. Descarga SQL Server Express: https://www.microsoft.com/es-es/sql-server/sql-server-downloads

2. Durante la instalación:
   - Selecciona "Basic" o "Custom"
   - **IMPORTANTE**: Anota el nombre de instancia (por defecto: `localhost\SQLEXPRESS`)
   - Habilita autenticación de SQL Server
   - Crea usuario `sa` con contraseña fuerte

3. Descarga SQL Server Management Studio (SSMS): https://aka.ms/ssmsfullsetup

### Opción 2: Docker (Más rápido)

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver \
   -d mcr.microsoft.com/mssql/server:2022-latest
```

## ⚙️ Instalación del Proyecto

### 1. Clonar/Extraer archivos
```bash
cd api
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# Si usas Docker, los valores por defecto funcionan
# Si usas SQL Express local, cambia DB_HOST a localhost\SQLEXPRESS
```

### 4. Crear la base de datos

Opción A: Usando SSMS
1. Abrir SQL Server Management Studio
2. Conectar al servidor
3. Ejecutar: `CREATE DATABASE NovaIndustriaDB;`

Opción B: Usando línea de comandos
```bash
sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "CREATE DATABASE NovaIndustriaDB"
```

### 5. Ejecutar migraciones
```bash
npm run migration:run
```

### 6. Iniciar el servidor
```bash
# Desarrollo (con hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## 🧪 Verificar Instalación

1. Abre tu navegador en: `http://localhost:3000`
2. Deberías ver: `{"message":"Nova Industria API v1.0.0"}`
3. Swagger docs en: `http://localhost:3000/api`

## 📊 Estructura de la Base de Datos

La API incluye las siguientes tablas:

### Usuarios y Autenticación
- `users` - Usuarios del sistema

### E-commerce
- `products` - Catálogo de productos
- `categories` - Categorías de productos
- `cart_items` - Items en carrito
- `orders` - Órdenes de compra
- `order_items` - Items de cada orden
- `product_reviews` - Reviews/comentarios de productos

### Formularios y Cotizaciones
- `project_quotes` - Formularios de cotización de proyectos
- `contact_forms` - Formularios de contacto
- `quote_attachments` - Archivos adjuntos

## 🔐 Credenciales por Defecto

Después de ejecutar las migraciones, se crea un usuario admin:

- **Email**: admin@novaindustria.co
- **Password**: Admin123!

## 📁 Estructura del Proyecto

```
api/
├── src/
│   ├── auth/              # Autenticación JWT
│   ├── users/             # Gestión de usuarios
│   ├── products/          # Catálogo de productos
│   ├── cart/              # Carrito de compras
│   ├── orders/            # Órdenes
│   ├── reviews/           # Comentarios/reviews
│   ├── quotes/            # Cotizaciones
│   ├── contact/           # Formularios de contacto
│   ├── config/            # Configuración
│   └── migrations/        # Migraciones de BD
├── uploads/               # Archivos subidos
└── .env                   # Variables de entorno
```

## 🛠️ Comandos Útiles

```bash
# Ver migraciones pendientes
npm run typeorm -- migration:show -d src/config/typeorm.config.ts

# Crear nueva migración
npm run migration:create src/migrations/NombreMigracion

# Revertir última migración
npm run migration:revert

# Limpiar y reconstruir
npm run build

# Ver logs en desarrollo
npm run start:dev
```

## ❓ Troubleshooting

### Error: "Login failed for user 'sa'"
- Verifica que SQL Server permite autenticación mixta (Windows + SQL)
- En SSMS: Server Properties → Security → "SQL Server and Windows Authentication mode"

### Error: "Cannot connect to SQL Server"
- Verifica que SQL Server está corriendo
- Verifica el nombre de instancia (localhost vs localhost\SQLEXPRESS)
- Verifica que el puerto 1433 está abierto

### Error: "Database does not exist"
- Asegúrate de haber creado la base de datos primero
- Ejecuta: `CREATE DATABASE NovaIndustriaDB;`

### Las migraciones no corren
- Verifica la conexión a la BD
- Verifica que la BD existe
- Revisa los logs para ver el error específico

## 📞 Soporte

Para problemas o dudas, revisa la documentación de NestJS y TypeORM:
- https://docs.nestjs.com
- https://typeorm.io
