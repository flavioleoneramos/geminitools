CREATE DATABASE  IF NOT EXISTS `gemini` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `gemini`;

CREATE TABLE `TextToVideo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `audiototext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

CREATE TABLE `imagetoimage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `imagetotext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `pdftotext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `texttoaudio` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `TextToImage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `texttotext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `videototext` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `msguser` text DEFAULT NULL,
  `msgbot` text DEFAULT NULL,
  `contexto` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE TextToText ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE TextToImage ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE ImageToText ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE ImageToImage ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE TextToAudio ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE AudioToText ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE TextToVideo ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE VideoToText ADD COLUMN linkArquivo VARCHAR(255);
ALTER TABLE PDFToText ADD COLUMN linkArquivo VARCHAR(255);
