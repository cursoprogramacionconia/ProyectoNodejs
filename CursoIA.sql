IF DB_ID('CursoIA') IS NULL
BEGIN
    CREATE DATABASE CursoIA;
END
GO

USE CursoIA;
GO

IF OBJECT_ID('dbo.usuario', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.usuario;
END
GO

IF OBJECT_ID('dbo.consulta', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.consulta;
END
GO

IF OBJECT_ID('dbo.paciente', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.paciente;
END
GO

IF OBJECT_ID('dbo.medicos', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.medicos;
END
GO

CREATE TABLE dbo.medicos
(
    id               INT IDENTITY(1,1) PRIMARY KEY,
    primer_nombre    VARCHAR(50)  NOT NULL,
    segundo_nombre   VARCHAR(50)  NULL,
    apellido_paterno VARCHAR(50)  NOT NULL,
    apellido_materno VARCHAR(50)  NOT NULL,
    cedula           VARCHAR(30)  NOT NULL,
    telefono         VARCHAR(15)  NOT NULL,
    especialidad     VARCHAR(50)  NOT NULL,
    email            VARCHAR(30)  NOT NULL,
    activo           BIT          NOT NULL DEFAULT (1),
    fecha_creacion   DATETIME     NOT NULL DEFAULT (GETDATE())
);
GO

CREATE TABLE dbo.paciente
(
    id               INT IDENTITY(1,1) PRIMARY KEY,
    primer_nombre    VARCHAR(50)  NOT NULL,
    segundo_nombre   VARCHAR(50)  NULL,
    apellido_paterno VARCHAR(50)  NOT NULL,
    apellido_materno VARCHAR(50)  NOT NULL,
    telefono         VARCHAR(15)  NOT NULL,
    activo           BIT          NOT NULL DEFAULT (1),
    fecha_creacion   DATETIME     NOT NULL DEFAULT (GETDATE())
);
GO

CREATE TABLE dbo.usuario
(
    id               INT IDENTITY(1,1) PRIMARY KEY,
    correo           VARCHAR(50)  NOT NULL,
    [password]       VARCHAR(50)  NOT NULL,
    nombre_completo  VARCHAR(100) NOT NULL,
    id_medico        INT          NULL,
    activo           BIT          NOT NULL DEFAULT (1),
    fecha_creacion   DATETIME     NOT NULL DEFAULT (GETDATE()),
    CONSTRAINT FK_usuario_medico FOREIGN KEY (id_medico) REFERENCES dbo.medicos(id)
);
GO

CREATE TABLE dbo.consulta
(
    id              INT IDENTITY(1,1) PRIMARY KEY,
    id_medico       INT NOT NULL,
    id_paciente     INT NOT NULL,
    sintomas        VARCHAR(300) NULL,
    recomendaciones VARCHAR(300) NULL,
    diagnostico     VARCHAR(500) NULL,
    CONSTRAINT FK_consulta_medico FOREIGN KEY (id_medico) REFERENCES dbo.medicos(id),
    CONSTRAINT FK_consulta_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.paciente(id)
);
GO
