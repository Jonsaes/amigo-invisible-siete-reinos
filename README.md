# El Amigo Invisible de los Siete Reinos

Una web para organizar **el amigo invisible de tu familia** ambientado en el mundo de *Canción de hielo y fuego*.
Cada familia es una Casa, cada persona escribe sus deseos en su «cámara», el Maestre lanza el Gran Sorteo y cada uno
descubre a quién le toca regalar. Además trae dos juegos opcionales para animar el mes:

- **La Larga Noche**: retos por capítulos que se van abriendo poco a poco. Hay preguntas, fotos que se aclaran, mapa,
  ordenar, emparejar, adivinar cifras, buscar a oscuras con una antorcha, memoria… Cada reto superado adorna el escudo de
  la Casa en el mapa, y las Casas compiten por el Trono de Hierro.
- **La Batalla por el Trono**: un concurso en directo para la sobremesa, con la tele como pantalla y los móviles como
  mandos. Incluye una intro, una apuesta final y la ceremonia del Trono.

Nació para una familia de verdad en la Navidad de 2026 y funcionó tan bien que lo compartimos por si a alguien más le apetece.

> **Proyecto de fans, sin ánimo de lucro y no oficial.** *Juego de Tronos* y *Canción de hielo y fuego*, sus nombres,
> personajes y lugares pertenecen a HBO y a George R. R. Martin. Este proyecto no tiene ninguna relación con ellos.
> No incluye imágenes, música ni vídeos de la serie: los escudos, el mapa y la música los dibuja y compone la propia
> página, y las fotos de los retos (`retos/`) se generaron con inteligencia artificial para este proyecto.

## Qué necesitas

- Una cuenta de **GitHub** (para tener tu copia del proyecto).
- Una cuenta de **Netlify** (gratis): publica la web y hace de árbitro de los retos.
- Un proyecto de **Firebase** (gratis, plan Spark): la base de datos donde se guardan los registros, deseos y puntos.

No hace falta saber programar: todo lo que se cambia está en bloques de texto con explicaciones.

## Puesta en marcha

### 1. Tu copia
Pulsa **Fork** (arriba a la derecha en GitHub) o descarga el proyecto y súbelo a un repositorio tuyo.

### 2. Firebase (una sola vez)
1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com).
2. **Realtime Database** → Crear base de datos (en Europa, modo bloqueado).
3. **Authentication** → Sign-in method → activa **Anónimo**.
4. **Realtime Database → Reglas**: borra lo que haya, pega el contenido de `reglas-firebase.json` y **cambia
   `CAMBIA-ESTA-CLAVE`** por la clave del Maestre que quieras (entre comillas simples). Publica.
   Esa clave solo vive en las reglas de tu Firebase: nadie la ve desde la web.
5. Configuración del proyecto → **Agregar app web** `</>` → copia el bloque `firebaseConfig` y pégalo en `index.html`,
   en `const FIREBASE_CONFIG = …` (ahora pone `null`).

### 3. Netlify
1. *Add new site → Import an existing project* → elige tu repositorio de GitHub. No hay que configurar nada más:
   el archivo `netlify.toml` ya lo dice todo. Desde ese momento, cada cambio que subas a GitHub se publica solo.
2. Para que funcionen **La Larga Noche y la sobremesa**, Netlify necesita una llave de tu Firebase. En Netlify →
   *Site configuration → Environment variables*, añade:
   - `FIREBASE_DB_URL` → la `databaseURL` de tu `firebaseConfig` (termina en `firebasedatabase.app`).
   - `FIREBASE_SECRET` → Firebase → Configuración del proyecto → *Cuentas de servicio* → *Secretos de la base de datos* → Mostrar.
     Si tu Firebase no enseña esa opción: *Generar nueva clave privada*, abre el `.json` descargado y pega todo su
     contenido en una variable llamada `FIREBASE_SERVICE_ACCOUNT` (en vez de `FIREBASE_SECRET`).
   - Vuelve a publicar (*Deploys → Trigger deploy*) para que las variables se apliquen.

**Nunca subas esas llaves a GitHub**: solo van en Netlify.

### 4. Tus familias
Abre `index.html`. Al principio está el bloque de **configuración** (lo único que hace falta tocar):
- `JUEGO`: título, año, fecha límite para apuntarse, día de la entrega de regalos y música propia (opcional).
- `CASAS`: una Casa por familia, con el apellido, el número de personas (`plazas`), el lema y el escudo (`wolf`,
  `lion`, `dragon`, `stag`, `rose`, `kraken`, `sun`, `falcon`, `trout`). Hay cuatro Casas de reserva con `plazas: 0`:
  pon un número para activarlas. **No cambies el `id` de una Casa cuando ya haya gente apuntada.**
- `LUGARES` y `ARTE`: los sitios del mapa y las imágenes opcionales del juego. Si una imagen no existe, la página usa
  un dibujo propio, así que funciona sin ninguna.

Comparte el enlace de Netlify con la familia. La **Sala del Maestre** está en `tu-web/#/maestre`.

## Cómo se juega

1. Cada persona entra, elige su Casa, escribe su nombre y recibe un **código secreto** (`STARK-7F42K`). Que lo guarde.
2. Con el código entra en su cámara y escribe sus **deseos** (puede pegar enlaces de tiendas: la web lee la foto y el título).
3. Cuando todas las Casas están completas, el Maestre lanza el **Gran Sorteo** desde su sala.
4. Cada uno rompe el lacre con su código y descubre a quién regala y su lista de deseos. Puede mandarle un **cuervo
   anónimo** pidiéndole más pistas.

En la Sala del Maestre hay además un texto listo para **convocar por WhatsApp** a quien falte por apuntarse o por
escribir deseos, y botones para dar un código nuevo o expulsar a alguien que se equivocó de Casa.

## La Larga Noche (retos)

Los retos están en `netlify/functions/retos.json`. Vienen **207 retos en 14 capítulos** listos para jugar.
Al principio del archivo (`_ayuda`) se explica cada campo con ejemplos. Ese archivo vive en Netlify: el navegador nunca
lo ve, así que nadie puede mirar las respuestas.

- Los **capítulos** se abren uno a uno desde la Sala del Maestre. Al abrir uno te deja un mensaje listo para WhatsApp.
- Cada capítulo se juega **en individual**: cada persona tiene sus 3 intentos por reto, a su ritmo, y la Casa suma la
  media de quienes han participado. 3 puntos a la primera, 1 a la segunda.
- Solo juegan las **Casas completas**.
- **Tipos de reto**:
  - `test`: pregunta con 4 opciones, con foto o sin ella.
  - `foto`: la imagen sale borrosa y se va aclarando; acertar rápido da puntos extra.
  - `silueta`: la imagen sale en negro; necesita un PNG con fondo transparente.
  - `emojis`: una pista hecha con emojis.
  - `mapa`: tocar un sitio en el mapa, con foto del lugar o sin ella.
  - `ordena` y `empareja`.
  - `numero`: adivinar una cifra con una barra; tras cada fallo te dice si es más o menos.
  - `zona`: tocar un punto concreto de una foto.
  - `antorcha`: buscar algo en una foto a oscuras, con una antorcha que se consume.
  - `memoria`: ver una escena 8 segundos y responder sin volver a verla.
  - `cuervo`: cada Casa tiene media clave y la otra mitad la tiene otra Casa; hay que hablar entre ellas.
- Las imágenes van en la carpeta `retos/`. Usa solo fotos tuyas o con permiso.
- Mejor añadir los retos nuevos en un **capítulo nuevo**: si se meten en uno ya abierto, quien lo había completado deja
  de tenerlo completo.

## La sobremesa (La Batalla por el Trono)

Son las preguntas de `retos.json` marcadas con `"sobremesa": true`. Se juegan en el orden del archivo, y **la última es
la de la apuesta**: si añades preguntas, ponlas antes de ella.
- **La tele**: lo más fiable es un portátil conectado por HDMI, con Chrome a pantalla completa en `tu-web/#/pantalla`.
- **Los móviles**: cada Casa responde desde la cámara de uno de sus miembros. Cuenta la primera respuesta de cada Casa.
- **El Maestre** lo dirige todo desde su sala, en el bloque *La sobremesa*:
  - *Preparar* calcula la ventaja de salida según La Larga Noche.
  - *Intro en la tele* pone la intro.
  - *Lanzar* y *Cerrar* llevan cada pregunta.
  - Antes de la última se abre la apuesta. Al final, *Ceremonia*.
- **Puntos**: cada Casa sale con 0–300 según su puesto en La Larga Noche. Cada acierto vale 100, más hasta 50 por
  rapidez. En la última, cada Casa apuesta a todo o nada.

En la Sala del Maestre hay demostraciones (`#/demo`, `#/demo-retos`, `#/demo-tv`, `#/demo-movil`) para ensayar sin tocar
los datos reales.

## Probar en tu ordenador

Con `const FIREBASE_CONFIG = null;` la web funciona en **modo local**: todo se guarda solo en tu navegador, y la clave del
Maestre es `maestre`. Para que La Larga Noche funcione en local hay que servir la carpeta con un servidor web:

```
python pruebas/servir.py
```

y abrir `http://localhost:8765/index.html`. Las pruebas automáticas están en `pruebas/` (ver `pruebas/LEEME-pruebas.md`).

## Cómo está hecho

- `index.html`: toda la web en un único archivo (HTML, CSS y JavaScript, sin frameworks).
- `netlify/functions/reto.js`: el árbitro. Corrige las respuestas y escribe los puntos en Firebase con su llave de
  administrador, para que nadie pueda hacer trampas desde el móvil.
- `netlify/functions/retos.json`: el banco de retos.
- `netlify/functions/ficha.js`: lee el título y la foto de los enlaces de tiendas para la lista de deseos.
- `reglas-firebase.json`: las reglas de seguridad de la base de datos.
- `netlify.toml`: la configuración de Netlify; además impide descargar los archivos internos desde la web.

## Licencia

El código se publica con licencia [MIT](LICENSE): úsalo, cámbialo y compártelo libremente. Los nombres y el universo de
*Canción de hielo y fuego* no son nuestros (ver el aviso del principio).
