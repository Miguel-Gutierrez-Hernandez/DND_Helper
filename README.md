# El Cuaderno del Guardián

Herramienta de mesa para Dungeon Masters de **D&D 5ª edición (2024)**: genera PNJ, personajes jugadores y monstruos ajustados a tu grupo, con las tiradas justas de azar y las que tú decidas. Funciona íntegramente en el navegador (HTML + CSS + JavaScript vainilla, sin frameworks ni backend).

> Herramienta de apoyo no oficial creada por y para aficionados. No sustituye al manual: verifica siempre en él los casos importantes de reglas.

---

## Cómo usarla

`index.html` espera los ficheros organizados así junto a él:

```
tu-carpeta/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── data.js
    ├── utils.js
    ├── storage.js
    ├── npc.js
    ├── pc.js
    ├── monster.js
    ├── workshop.js
    ├── sheetexport.js
    └── app.js
```

Si has descargado los ficheros sueltos, colócalos en esas subcarpetas (`css/` y `js/`) antes de abrir `index.html` — si no, los estilos y el código no se cargarán.

No requiere instalación ni build. Basta con abrir `index.html` en un navegador moderno, o servirlo desde cualquier servidor estático:

```bash
# opción rápida con Python
python3 -m http.server 8000
# abre http://localhost:8000
```

Necesita conexión a internet solo para las tipografías de Google Fonts (Cinzel, Spectral, IBM Plex Mono); si no hay conexión, el navegador usa una tipografía de reserva y todo lo demás sigue funcionando igual.

---

## Estructura del proyecto

```
index.html          Estructura de la página y las 6 pestañas
css/
  styles.css         Todo el estilo visual (tema "grimorio de mazmorra")
js/
  data.js            Datos del juego: especies, clases, trasfondos, oficios,
                      tiendas, hechizos (con alcance/duración/daño/concentración),
                      monstruos base, tablas de CR y de presupuesto de encuentro
  utils.js           Funciones auxiliares: dados, modificadores, bono de
                      competencia, reparto de estadísticas, descarga de JSON...
  storage.js         Capa de almacenamiento (persistente si el entorno lo permite,
                      con reserva en memoria de sesión si no)
  npc.js             Pestaña PNJ: generación, tiendas, ficha
  pc.js              Pestaña Personaje: generación, hechizos, ficha
  monster.js         Pestaña Monstruo: escalado por CR, multiataque,
                      encuentro mixto (varios tipos a la vez)
  workshop.js         Pestaña Taller: monstruos/objetos/hechizos personalizados,
                      objetos adjuntos a PNJ y PJ con sus bonos mecánicos
  sheetexport.js     Ficha de personaje exportable en HTML para jugadores,
                      y exportación/importación de un personaje suelto en JSON
  app.js             Arranque de la app, pestañas, listeners de formularios,
                      buscador de hechizos, copia de seguridad completa
```

El orden de carga de los `<script>` en `index.html` importa: `data.js` y `utils.js` van primero porque el resto depende de ellos; `app.js` va el último porque conecta los eventos de todo lo anterior.

---

## Las 6 pestañas

### PNJ
Eliges raza y oficio; el nivel, las estadísticas (repartidas según prioridad del oficio) y las habilidades salen por azar dentro de las reglas. Si el oficio lleva tienda (herrero, alquimista, sacerdote, encantador...), genera género acorde al nivel de tus jugadores, incluyendo objetos mágicos si procede. Se pueden adjuntar objetos del Taller directamente en la ficha.

### Personaje
Nivel, especie, trasfondo, clase, subclase y estadísticas son opcionales — lo que dejes vacío se genera al azar respetando las reglas 2024 (ajuste de característica por trasfondo, reparto de estadísticas según prioridad de la clase, PG, CA con bonos de armadura/escudo/objetos, conjuros con espacios correctos por nivel y descripción completa, equipo inicial, subclase automática a partir de nivel 3).

Cada personaje se puede:
- **Guardar** (persistente si el navegador lo soporta, si no en memoria de sesión).
- **Exportar como ficha para el jugador**: un HTML autocontenido y bonito, pensado para que alguien que nunca ha jugado lo entienda — incluye una guía rápida de reglas, las 18 habilidades con modificador calculado, salvaciones, hechizos con su descripción completa y objetos mágicos con su efecto.
- **Exportar sus datos en JSON** para compartirlo o volver a importarlo.

### Monstruo
Tres modos:
- **Existente**, ajustado a tus jugadores por presupuesto de encuentro (calcula cuántos hacen falta) o escalando sus estadísticas a un CR objetivo.
- **Completamente aleatorio**, con multiataque generado según su CR.
- **Encuentro mixto**: varias criaturas de distintos tipos a la vez, con cálculo de XP total, multiplicador por número de criaturas y veredicto de dificultad.

Los monstruos con varios golpes por turno (multiataque) reparten el daño de la tabla de CR entre cada ataque, en vez de mostrar un único golpe con todo el daño.

### Hechizos
Biblioteca buscable por nombre o efecto, con más de 170 hechizos que incluyen alcance, tiempo de lanzamiento, duración, si requieren concentración y sus dados de daño. Los hechizos creados en el Taller aparecen mezclados con los del manual.

### Taller
Crea tu propio contenido, que queda guardado y se integra automáticamente en el resto de la app:
- **Monstruos personalizados**: con estadísticas derivadas del CR o definidas a mano, y multiataque si pones más de un golpe.
- **Objetos mágicos**: con bono numérico (se aplica automáticamente a CA/ataque/daño al adjuntarlos a un PNJ o PJ) y habilidad especial en texto libre.
- **Hechizos**: con toda la misma información que los del manual (alcance, duración, concentración, daño), visibles en la Biblioteca de Hechizos y disponibles al generar personajes lanzadores.

### Guardados
Copia de seguridad completa (PNJ, personajes y todo el contenido del Taller) en un único JSON exportable/importable, además de la exportación/importación individual de personajes descrita arriba.

---

## Notas sobre el almacenamiento

`storage.js` intenta usar `window.storage` (persistencia real ofrecida por el entorno donde se aloje la app) y, si no está disponible, guarda en un array en memoria que dura mientras la pestaña esté abierta. En ese segundo caso, usa **"Exportar todo (JSON)"** en Guardados para no perder el trabajo entre sesiones.

---

## Precisión del contenido

Las mecánicas centrales (bono de competencia, reparto de estadísticas, PG, tablas de espacios de conjuro, tabla de creación de monstruos por CR, umbrales de XP por dificultad) siguen las reglas de 5e (2024). Algunos hechizos y monstruos incluidos son variaciones propias creadas para dar variedad de contenido y no corresponden 1:1 con el manual — funcionan bien para partidas caseras, pero conviene revisarlos si van a tener peso mecánico importante en una tirada crítica.

---

## Compatibilidad

Pensada para navegadores modernos (Chrome, Firefox, Edge, Safari recientes). Usa JavaScript ES2020+ (optional chaining, nullish coalescing, `async/await`) sin necesidad de transpilar.