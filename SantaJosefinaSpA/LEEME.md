# CRM Santa Josefina — estado actual

> El archivo `LEEME_ANTIGUO.md` describía una migración a medias y ya no corresponde al
> código de esta carpeta. Las instrucciones vigentes de instalación, verificación y
> mantención están en **[LEEME_DESPLIEGUE.md](LEEME_DESPLIEGUE.md)**.

---

## Resumen

El CRM está sobre **Google Apps Script**. La hoja de cálculo sigue siendo la base de
datos y **ya no queda nada de AppSheet** en el código.

```
GitHub Pages (HTML + JS, sin secretos)
        │  POST text/plain   { route, token, ... }
        ▼
Google Apps Script  (Api.gs dentro de la hoja)
        ▼
Hojas de cálculo
```

| Pieza | Archivo |
|-------|---------|
| Backend (servidor) | `Api.gs` |
| Manifiesto del proyecto | `appsscript.json` |
| Cliente del CRM (único que habla con el backend) | `assets/js/api_cliente.js` |
| Utilidades del CRM (UTM, honorarios, cabecera) | `assets/js/app.js` |
| Pruebas automáticas (93 casos) | `pruebas/pruebas_api.js` |
| Instrucciones completas | `LEEME_DESPLIEGUE.md` |

**Regla de oro:** en todas las páginas, `api_cliente.js` se carga **antes** que `app.js`.
El nombre del archivo va en **minúsculas** (GitHub Pages distingue mayúsculas).

---

## Lo mínimo para arrancar

1. Pegue `Api.gs` y `appsscript.json` en el proyecto de Apps Script de la hoja.
2. Ejecute `inicializarSecretos()`, luego `probarConexion()` y `probarVelocidadHash()`.
3. Implemente como aplicación web (**Ejecutar como: Yo**, **acceso: Cualquier persona**)
   y copie la URL `/exec` en `API_URL` de `assets/js/api_cliente.js`.
4. Cree el primer administrador con `claveTemporalUsuario('su@correo.cl')`.
5. Suba todo a GitHub Pages.

El detalle, las advertencias de seguridad y la lista de comprobaciones en el navegador
están en **[LEEME_DESPLIEGUE.md](LEEME_DESPLIEGUE.md)**.

---

## Antes de apagar AppSheet

Cuando confirme que el CRM funciona:

- **Elimine o desactive la app de AppSheet y su API.** Así la clave que estuvo
  publicada en este repositorio queda inservible.
- Borre de la publicación `test_resend.html` (herramienta de diagnóstico).
- Elimine las columnas `PlainPassword`, `PasswordHash` y `password` de `Usuarios` y
  `Copropietarios` cuando todo el equipo y todos los residentes tengan su clave nueva.
