-- =============================================
-- Nova Industria Database Schema
-- SQL Server 2019+
-- =============================================

USE NovaIndustriaDB;
GO

-- =============================================
-- 1. TABLA DE USUARIOS
-- =============================================
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    nombre NVARCHAR(100),
    apellido NVARCHAR(100),
    telefono NVARCHAR(20),
    role NVARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'guest')),
    isActive BIT DEFAULT 1,
    empresa NVARCHAR(255),
    nit NVARCHAR(50),
    cargo NVARCHAR(100),
    direccion NVARCHAR(MAX),
    ciudad NVARCHAR(100),
    pais NVARCHAR(100),
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
GO

-- =============================================
-- 2. CATEGORÍAS DE PRODUCTOS
-- =============================================
CREATE TABLE categories (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    descripcion NVARCHAR(MAX),
    icono NVARCHAR(50),
    orden INT DEFAULT 0,
    isActive BIT DEFAULT 1,
    parentId UNIQUEIDENTIFIER NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (parentId) REFERENCES categories(id)
);
GO

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parentId);
GO

-- =============================================
-- 3. PRODUCTOS
-- =============================================
CREATE TABLE products (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    sku NVARCHAR(50) NOT NULL UNIQUE,
    nombre NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255) NOT NULL UNIQUE,
    descripcion NVARCHAR(MAX),
    descripcionCorta NVARCHAR(500),
    precio DECIMAL(18, 2) NOT NULL,
    precioAnterior DECIMAL(18, 2),
    stock INT DEFAULT 0,
    stockMinimo INT DEFAULT 5,
    categoryId UNIQUEIDENTIFIER NOT NULL,
    marca NVARCHAR(100),
    modelo NVARCHAR(100),
    imagenPrincipal NVARCHAR(500),
    imagenes NVARCHAR(MAX), -- JSON array de URLs
    especificaciones NVARCHAR(MAX), -- JSON object
    peso DECIMAL(10, 2), -- en kg
    dimensiones NVARCHAR(100), -- formato: "LxWxH cm"
    garantia NVARCHAR(100),
    isActive BIT DEFAULT 1,
    isFeatured BIT DEFAULT 0,
    isNew BIT DEFAULT 0,
    views INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    reviewCount INT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (categoryId) REFERENCES categories(id)
);
GO

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(categoryId);
CREATE INDEX idx_products_featured ON products(isFeatured);
CREATE INDEX idx_products_active ON products(isActive);
GO

-- =============================================
-- 4. CARRITO DE COMPRAS
-- =============================================
CREATE TABLE cart_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NULL,
    sessionId NVARCHAR(255) NULL, -- Para usuarios no autenticados
    productId UNIQUEIDENTIFIER NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precioUnitario DECIMAL(18, 2) NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id)
);
GO

CREATE INDEX idx_cart_user ON cart_items(userId);
CREATE INDEX idx_cart_session ON cart_items(sessionId);
CREATE INDEX idx_cart_product ON cart_items(productId);
GO

-- =============================================
-- 5. ÓRDENES
-- =============================================
CREATE TABLE orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    orderNumber NVARCHAR(50) NOT NULL UNIQUE,
    userId UNIQUEIDENTIFIER NULL,
    
    -- Información de contacto
    email NVARCHAR(255) NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    apellido NVARCHAR(100) NOT NULL,
    telefono NVARCHAR(20) NOT NULL,
    
    -- Dirección de envío
    direccion NVARCHAR(MAX) NOT NULL,
    ciudad NVARCHAR(100) NOT NULL,
    estado NVARCHAR(100),
    codigoPostal NVARCHAR(20),
    pais NVARCHAR(100) NOT NULL,
    
    -- Dirección de facturación (si es diferente)
    direccionFacturacion NVARCHAR(MAX),
    ciudadFacturacion NVARCHAR(100),
    estadoFacturacion NVARCHAR(100),
    codigoPostalFacturacion NVARCHAR(20),
    paisFacturacion NVARCHAR(100),
    
    -- Empresa (opcional)
    empresa NVARCHAR(255),
    nit NVARCHAR(50),
    
    -- Totales
    subtotal DECIMAL(18, 2) NOT NULL,
    impuestos DECIMAL(18, 2) DEFAULT 0,
    envio DECIMAL(18, 2) DEFAULT 0,
    descuento DECIMAL(18, 2) DEFAULT 0,
    total DECIMAL(18, 2) NOT NULL,
    
    -- Estado
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    paymentStatus NVARCHAR(20) DEFAULT 'pending' CHECK (paymentStatus IN ('pending', 'paid', 'failed', 'refunded')),
    paymentMethod NVARCHAR(50),
    
    -- Tracking
    trackingNumber NVARCHAR(100),
    courier NVARCHAR(100),
    
    -- Notas
    notas NVARCHAR(MAX),
    notasInternas NVARCHAR(MAX),
    
    -- Fechas
    paidAt DATETIME2,
    shippedAt DATETIME2,
    deliveredAt DATETIME2,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
GO

CREATE INDEX idx_orders_number ON orders(orderNumber);
CREATE INDEX idx_orders_user ON orders(userId);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(paymentStatus);
CREATE INDEX idx_orders_date ON orders(createdAt);
GO

-- =============================================
-- 6. ITEMS DE ÓRDENES
-- =============================================
CREATE TABLE order_items (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    orderId UNIQUEIDENTIFIER NOT NULL,
    productId UNIQUEIDENTIFIER NOT NULL,
    sku NVARCHAR(50) NOT NULL,
    nombre NVARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    precioUnitario DECIMAL(18, 2) NOT NULL,
    subtotal DECIMAL(18, 2) NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id)
);
GO

CREATE INDEX idx_order_items_order ON order_items(orderId);
CREATE INDEX idx_order_items_product ON order_items(productId);
GO

-- =============================================
-- 7. REVIEWS/COMENTARIOS DE PRODUCTOS
-- =============================================
CREATE TABLE product_reviews (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    productId UNIQUEIDENTIFIER NOT NULL,
    userId UNIQUEIDENTIFIER NULL,
    orderId UNIQUEIDENTIFIER NULL,
    
    -- Review
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    titulo NVARCHAR(200),
    comentario NVARCHAR(MAX),
    
    -- Información del reviewer (si no está autenticado)
    nombre NVARCHAR(100),
    email NVARCHAR(255),
    
    -- Status
    isApproved BIT DEFAULT 0,
    isVerifiedPurchase BIT DEFAULT 0,
    
    -- Helpful votes
    helpfulCount INT DEFAULT 0,
    notHelpfulCount INT DEFAULT 0,
    
    -- Respuesta del vendedor
    respuesta NVARCHAR(MAX),
    respuestaAt DATETIME2,
    
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL
);
GO

CREATE INDEX idx_reviews_product ON product_reviews(productId);
CREATE INDEX idx_reviews_user ON product_reviews(userId);
CREATE INDEX idx_reviews_approved ON product_reviews(isApproved);
GO

-- =============================================
-- 8. COTIZACIONES DE PROYECTOS
-- =============================================
CREATE TABLE project_quotes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    quoteNumber NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Servicio
    servicioIngenieria BIT DEFAULT 1,
    
    -- Datos de la empresa
    empresa NVARCHAR(255) NOT NULL,
    nit NVARCHAR(50) NOT NULL,
    sector NVARCHAR(50) CHECK (sector IN ('construccion', 'industria', 'energia', 'educacion', 'publica', 'otro')),
    
    -- Persona de contacto
    contacto NVARCHAR(100) NOT NULL,
    cargo NVARCHAR(100) NOT NULL,
    correo NVARCHAR(255) NOT NULL,
    celular NVARCHAR(20) NOT NULL,
    
    -- Detalle del proyecto
    detalle NVARCHAR(MAX) NOT NULL,
    
    -- Ejecución y tiempos
    region NVARCHAR(100) NOT NULL,
    fechaInicio DATE NOT NULL,
    presupuestoEstado NVARCHAR(20) CHECK (presupuestoEstado IN ('si', 'no', 'en_evaluacion')),
    presupuestoMin DECIMAL(18, 2),
    presupuestoMax DECIMAL(18, 2),
    
    -- Adjuntos
    adjuntarDocs BIT DEFAULT 0,
    
    -- Consentimiento
    aceptaDatos BIT DEFAULT 1,
    
    -- Estado
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'quoted', 'accepted', 'rejected', 'cancelled')),
    
    -- Respuesta
    respuesta NVARCHAR(MAX),
    cotizacionMonto DECIMAL(18, 2),
    cotizacionPDF NVARCHAR(500),
    
    -- Fechas
    respondedAt DATETIME2,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX idx_quotes_number ON project_quotes(quoteNumber);
CREATE INDEX idx_quotes_status ON project_quotes(status);
CREATE INDEX idx_quotes_date ON project_quotes(createdAt);
GO

-- =============================================
-- 9. ARCHIVOS ADJUNTOS DE COTIZACIONES
-- =============================================
CREATE TABLE quote_attachments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    quoteId UNIQUEIDENTIFIER NOT NULL,
    tipo NVARCHAR(20) CHECK (tipo IN ('plano', 'especificacion', 'foto')),
    nombreArchivo NVARCHAR(255) NOT NULL,
    rutaArchivo NVARCHAR(500) NOT NULL,
    tamano INT, -- en bytes
    mimeType NVARCHAR(100),
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (quoteId) REFERENCES project_quotes(id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_attachments_quote ON quote_attachments(quoteId);
GO

-- =============================================
-- 10. FORMULARIOS DE CONTACTO
-- =============================================
CREATE TABLE contact_forms (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    telefono NVARCHAR(20),
    empresa NVARCHAR(255),
    asunto NVARCHAR(255) NOT NULL,
    mensaje NVARCHAR(MAX) NOT NULL,
    tipo NVARCHAR(20) DEFAULT 'general' CHECK (tipo IN ('general', 'soporte', 'ventas', 'cotizacion')),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'responded', 'closed')),
    respuesta NVARCHAR(MAX),
    respondedAt DATETIME2,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX idx_contact_status ON contact_forms(status);
CREATE INDEX idx_contact_date ON contact_forms(createdAt);
GO

-- =============================================
-- 11. WISHLIST (LISTA DE DESEOS)
-- =============================================
CREATE TABLE wishlists (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NOT NULL,
    productId UNIQUEIDENTIFIER NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE (userId, productId)
);
GO

CREATE INDEX idx_wishlist_user ON wishlists(userId);
GO

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Usuario Admin
INSERT INTO users (id, email, password, nombre, apellido, role, isActive)
VALUES (
    NEWID(),
    'admin@novaindustria.co',
    '$2b$10$YourHashedPasswordHere', -- Debes hashear "Admin123!" con bcrypt
    'Administrador',
    'Sistema',
    'admin',
    1
);
GO

-- Categorías principales
DECLARE @catMaquinaria UNIQUEIDENTIFIER = NEWID();
DECLARE @catHerramientas UNIQUEIDENTIFIER = NEWID();
DECLARE @catComponentes UNIQUEIDENTIFIER = NEWID();

INSERT INTO categories (id, nombre, slug, descripcion, orden) VALUES
(@catMaquinaria, 'Maquinaria Industrial', 'maquinaria-industrial', 'Maquinaria pesada y equipos industriales', 1),
(@catHerramientas, 'Herramientas', 'herramientas', 'Herramientas y equipos manuales', 2),
(@catComponentes, 'Componentes', 'componentes', 'Componentes y repuestos industriales', 3);
GO

PRINT 'Database schema created successfully!';
PRINT 'Next steps:';
PRINT '1. Update admin password hash';
PRINT '2. Run migrations from NestJS';
PRINT '3. Start the API server';
GO
