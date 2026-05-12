# 🏭 Nova Industria API

API completa para e-commerce industrial con gestión de productos, carrito, órdenes, cotizaciones y formularios.

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env
cp .env.example .env
# Editar .env con tus credenciales de SQL Server

# 3. Crear base de datos
sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "CREATE DATABASE NovaIndustriaDB"

# 4. Ejecutar script SQL inicial (opcional - también puedes usar migrations)
sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -d NovaIndustriaDB -i database-schema.sql

# 5. O ejecutar migrations de TypeORM
npm run migration:run

# 6. Iniciar servidor
npm run start:dev
```

## 📡 Endpoints Principales

### Autenticación
```
POST /auth/register          - Registrar nuevo usuario
POST /auth/login             - Iniciar sesión
GET  /auth/profile           - Obtener perfil (requiere token)
```

### Productos
```
GET    /products             - Listar productos (con filtros, búsqueda, paginación)
GET    /products/:id         - Obtener producto por ID
GET    /products/slug/:slug  - Obtener producto por slug
POST   /products             - Crear producto (admin)
PATCH  /products/:id         - Actualizar producto (admin)
DELETE /products/:id         - Eliminar producto (admin)
```

### Categorías
```
GET    /categories           - Listar categorías
GET    /categories/:id       - Obtener categoría
POST   /categories           - Crear categoría (admin)
```

### Carrito
```
GET    /cart                 - Ver carrito actual
POST   /cart/add             - Agregar item al carrito
PATCH  /cart/update/:id      - Actualizar cantidad
DELETE /cart/remove/:id      - Eliminar item
DELETE /cart/clear           - Vaciar carrito
```

### Órdenes
```
POST   /orders               - Crear orden desde carrito
GET    /orders               - Listar mis órdenes
GET    /orders/:id           - Obtener detalle de orden
GET    /orders/number/:num   - Buscar por número de orden
PATCH  /orders/:id/status    - Actualizar estado (admin)
```

### Reviews
```
GET    /reviews/product/:id  - Reviews de un producto
POST   /reviews              - Crear review
PATCH  /reviews/:id/helpful  - Marcar como útil
```

### Cotizaciones
```
POST   /quotes               - Enviar formulario de cotización
GET    /quotes               - Listar cotizaciones (admin)
GET    /quotes/:id           - Obtener cotización
PATCH  /quotes/:id/respond   - Responder cotización (admin)
```

### Contacto
```
POST   /contact              - Enviar formulario de contacto
GET    /contact              - Listar mensajes (admin)
```

## 📊 Modelos de Datos

### Usuario
```typescript
{
  id: string (UUID)
  email: string
  password: string (hasheado)
  nombre: string
  apellido: string
  telefono: string
  role: 'admin' | 'customer' | 'guest'
  empresa: string
  nit: string
  ...
}
```

### Producto
```typescript
{
  id: string (UUID)
  sku: string
  nombre: string
  slug: string
  descripcion: string
  precio: number
  stock: number
  categoryId: string
  marca: string
  imagenes: string[] (URLs)
  rating: number
  reviewCount: number
  ...
}
```

### Orden
```typescript
{
  id: string (UUID)
  orderNumber: string
  userId: string
  items: OrderItem[]
  subtotal: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  paymentStatus: 'pending' | 'paid' | 'failed'
  ...
}
```

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens) para autenticación.

```bash
# 1. Registrarse o iniciar sesión
POST /auth/login
{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}

# 2. Respuesta incluye token
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}

# 3. Usar token en headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📁 Estructura del Proyecto

```
api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── entities/user.entity.ts
│   │   └── dto/
│   ├── products/
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── entities/product.entity.ts
│   │   └── dto/
│   ├── cart/
│   ├── orders/
│   ├── reviews/
│   ├── quotes/
│   ├── contact/
│   ├── config/
│   │   └── typeorm.config.ts
│   ├── migrations/
│   ├── main.ts
│   └── app.module.ts
├── uploads/
├── .env.example
├── database-schema.sql
├── package.json
└── README.md
```

## 🧪 Ejemplos de Uso

### Buscar productos
```bash
GET /products?search=taladro&category=herramientas&minPrice=100&maxPrice=500&sort=price&order=ASC&page=1&limit=20
```

### Crear orden
```bash
POST /orders
{
  "direccion": "Calle 123",
  "ciudad": "Bogotá",
  "telefono": "3001234567",
  "paymentMethod": "transferencia"
}
```

### Enviar cotización
```bash
POST /quotes
{
  "empresa": "Mi Empresa SAS",
  "nit": "900123456",
  "sector": "construccion",
  "contacto": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "detalle": "Necesito cotización para...",
  "region": "Bogotá",
  "fechaInicio": "2024-03-01"
}
```

## 🔧 Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_DATABASE=NovaIndustriaDB

# JWT
JWT_SECRET=tu-secret-super-seguro
JWT_EXPIRATION=7d

# App
PORT=3000
NODE_ENV=development
```

## 📝 Notas Importantes

1. **Passwords**: Todos los passwords se hashean con bcrypt (10 rounds)
2. **UUIDs**: Se usan UUIDs v4 para todos los IDs
3. **Timestamps**: Todas las tablas tienen createdAt y updatedAt
4. **Soft Deletes**: No implementado por defecto (se puede agregar)
5. **File Uploads**: Los archivos se guardan en `/uploads`

## 🐛 Debugging

```bash
# Ver logs detallados
npm run start:dev

# Ver queries SQL
# En typeorm.config.ts, set logging: true

# Verificar conexión a BD
sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -Q "SELECT @@VERSION"
```

## 🚢 Despliegue

Para producción:

```bash
# Build
npm run build

# Ejecutar
NODE_ENV=production npm run start:prod
```

## 📞 Soporte

- Documentación NestJS: https://docs.nestjs.com
- TypeORM: https://typeorm.io
- SQL Server: https://learn.microsoft.com/sql/
