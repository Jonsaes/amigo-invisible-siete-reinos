# El Amigo Invisible de los Siete Reinos — guía para Claude Code

Web de amigo invisible familiar ambientada en el mundo de *Canción de hielo y fuego* (cada familia es una Casa), con un
juego de retos opcional («La Larga Noche») y un concurso en directo para la sobremesa («La Batalla por el Trono»).
Desplegada en Netlify con Firebase Realtime Database. El manual para quien la monta es `README.md`.

## Reglas de trabajo
- No cambies el `id` de ninguna Casa ni de ningún reto que ya se haya jugado: están guardados en Firebase.
- `FIREBASE_SECRET` / `FIREBASE_SERVICE_ACCOUNT` solo viven en las variables de entorno de Netlify: nunca en el repositorio.
- Las tablas/listados nuevos llevan ordenación pulsando la cabecera y búsqueda (hay un helper `tabla()`).
- Antes de dar por terminado un cambio: ejecuta las pruebas de `pruebas/` que toquen (ver `pruebas/LEEME-pruebas.md`).
  Si cambias `reto.js` o `retos.json`: `node pruebas/test_reto.js`, `node pruebas/test_reto_tipos.js` y `node pruebas/test_reto_indiv.js` como mínimo.
- No añadas imágenes, música ni vídeos con derechos de terceros (de la serie, de internet…): solo material propio o con licencia libre.

## Cómo funciona por dentro (lo justo para no romperlo)
- **Datos** en Firebase bajo `ai/2026/`: `publico/{pid}` (nombre, casa), `privado/{pid}` (código), `uids/{uid}` → pid,
  `deseos`, `asignaciones` (el sorteo), `estado`, `contador` (plazas), `maestres/{uid}`, `larganoche/{casas,personas,retos,capitulos,config}`,
  `directo` (la sobremesa). Modo local: `FIREBASE_CONFIG = null` → todo en `localStorage` (`store.L`).
- **El `store`** (`index.html`) abstrae Firebase/local: `get/set/update`, listeners `onChange`, `sync()` en local.
  `DEMO = true` desactiva escrituras y listeners (rutas `#/demo`, `#/demo-retos`, `#/demo-tv`, `#/demo-movil`).
- **Barajado determinista**: las opciones de cada reto se barajan con una semilla (`id` del reto + `ROOT`) igual en
  `reto.js` (`baraja/orden`) y en `index.html` (`barajaN/ordenN`). Si cambias uno, cambia el otro igual.
- **Modo de capítulo**: `larganoche/capitulos/{id}.modo` lo pone el Maestre al abrir un capítulo que nunca se abrió → `'individual'`
  (un capítulo sin `modo` se juega en grupo). En individual, cada miembro juega en `casas/{casa}/miembros/{pid}/retos`,
  la Casa suma la media redondeada de los que han tocado algo del capítulo (`casas/{casa}/indiv/{cap}` = {pts, part}),
  `hechos/{reto}` cuenta cada reto una vez para el escudo y la gema llega cuando un miembro termina todo. Los retos `cuervo` siempre en grupo.
  La lógica está duplicada en `reto.js` (`aplicar`) y en `index.html` (`aplicarN`, modo local): si cambias una, cambia la otra.
- **La Larga Noche**: 3 intentos por reto y Casa (o por miembro en capítulos individuales); puntos 3/1/0; foto +2 (<5 s)/+1 (<12 s); escarcha +1 por fallo (máx 5);
  niveles por retos superados (hoguera 1, bronce 5, plata 15, oro 30, dragón 50); gemas por capítulo completo;
  títulos (Trono de Hierro = 1.º, Mano del Rey = 2.º…). Solo juegan Casas completas (`larganoche/config/plazas`).
- **La sobremesa** (`directo`): estados `off → espera → intro → pregunta ⇄ cerrada → apuesta → pregunta → cerrada → final`.
  El Maestre dirige desde `#/maestre` (bloque *La sobremesa*); la tele abre `#/pantalla`; cada móvil responde desde su
  cámara (`#liveBox`); la primera respuesta de cada Casa es la que cuenta (regla de Firebase `!data.exists()`).
  La corrección la hace el móvil del Maestre con las preguntas que pide a `reto.js` (`accion:'directo'`, verificado por idToken).
  Puntos: salida 0–300 según La Larga Noche, acierto 100 + hasta 50 por rapidez, apuesta a todo o nada en la última.
- **La intro** (`renderIntro`, constantes `INTRO`): 84 s sincronizados con `musica/intro.mp3`
  (escenas: título 0 s, Caminantes 8 s, batalla 19,4 s, escudos 42,3 s, trono 65,1 s, golpe 76,6 s).
- **Audio**: `audio` (WebAudio) genera efectos y el tema de fondo si `JUEGO.musica` está vacío.

