# hand-server (Spring Boot + MediaPipe JS)

Contenido: servidor Java (Spring Boot) que sirve la interfaz estática y un endpoint para recibir el estado de manos.
La detección de manos se realiza en el navegador usando MediaPipe JS.

## Ejecutar localmente

Requisitos: Java 17+, Maven

```bash
cd hand-server
mvn clean package
mvn spring-boot:run
```

Abrir: http://localhost:8080/

## Estructura
- src/main/resources/static/ : index.html, script.js, style.css (frontend)
- src/main/java/... : servidor Spring Boot

