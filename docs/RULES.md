# Reglas del Cacho — fuente de verdad del motor

Este documento define EXACTAMENTE las reglas que implementa el motor (`src/engine`).
Es la "fuente de verdad": si una regla cambia, se cambia acá y en el código.

## Pintas

| Valor | Nombre |
|-------|--------|
| 1 | As (comodín) |
| 2 | Tonto |
| 3 | Tren |
| 4 | Cuadra |
| 5 | Quina |
| 6 | Sexta |

- Cada jugador parte con **5 dados** en su cacho.
- El **As (1) es comodín**: cuenta como cualquier pinta… salvo las excepciones de abajo.

## Apuestas

Una apuesta es **cantidad + pinta** ("hay al menos N dados de la pinta P en la mesa"),
ej. *"cuatro quinas"* = `{ cantidad: 4, pinta: 5 }`. La cuenta es sobre **todos** los
dados de la mesa.

Para subir, la apuesta nueva debe ser estrictamente mayor:

- **Normal → Normal:** subes la cantidad (con cualquier pinta), o mantienes la
  cantidad subiendo la pinta.
- **Normal → Ases:** necesitas al menos **⌈cantidad/2⌉** ases ("la mitad más grande").
  Ej: de *"11 sextas"* → *"6 ases"*; de *"6 quinas"* → *"3 ases"*.
- **Ases → Normal:** necesitas al menos **cantidad·2 + 1**. Ej: tras *"3 ases"* →
  *"7 de cualquier pinta"*.
- **Ases → Ases:** subes la cantidad de ases.

## Acciones por turno

- **Apostar / Subir:** declarar una apuesta válida.
- **Dudar:** "no hay tantos". Se revela la mesa y se cuenta la pinta de la apuesta:
  - cantidad real **≥** declarada → la apuesta era buena → **pierde el dudador**.
  - cantidad real **<** declarada → **pierde el apostador**.
- **Calzar:** "es exactamente esa cantidad". Se revela:
  - exacto → el calzador **recupera un dado** (hasta 5).
  - no exacto → el calzador **pierde un dado**.
  - **Sólo se puede calzar mientras en la mesa quede al menos la MITAD de los dados
    iniciales totales.** Ej: 4 jugadores · 5 dados = 20 → se puede calzar con ≥ 10
    dados en juego.

El perdedor de la ronda pierde **1 dado** (salvo la siciliana). Quien se queda en
**0 dados queda eliminado**. Gana el último en pie.

## Turno y apertura

- **Primer abridor de la partida:** se elige **al azar**.
- **Abridor de las siguientes rondas:** el **perdedor** de la ronda anterior. Si calza
  acertando, abre el calzador.
- **Si el perdedor queda eliminado**, abre el jugador a su **derecha**.
- **Sentido del juego:** el abridor de cada ronda **elige si se juega hacia la
  izquierda o hacia la derecha**.

## Variantes de la casa

### 1. Obligado cerrado
Cuando un jugador queda con **1 dado** y le toca **abrir** la ronda (la **primera
vez** que esto ocurre), la ronda es de **obligado** y **cerrada**:

- El **obligado SÍ ve su propio dado**.
- Los demás juegan **a ciegas**, **salvo** quien también tenga 1 dado, que sí ve el
  suyo. (Regla efectiva: en ronda cerrada ves tus dados sólo si tienes exactamente 1.)
- **Sólo un jugador con 1 dado puede cambiar la pinta.** El resto (2+ dados) sólo
  puede **dudar** o **agrandar la apuesta** (subir la cantidad manteniendo la pinta);
  tampoco puede calzar.

### 2. Ases no comodín en obligado
En la ronda de obligado, **el As NO es comodín**: cuenta sólo como pinta 1.

### 3. La siciliana
Si un jugador **duda de inmediato** la **primera apuesta de la ronda** (la del
abridor):

- **El perdedor pierde 2 dados** en vez de 1 (sea el apostador o el dudador).
- En ese conteo **los ases NO valen como comodín**, sólo como 1.

## Configuración

Todo lo anterior vive en `ReglasCasa` (`src/engine/types.ts`) con sus defaults en
`src/engine/config.ts`. Se puede crear una partida con reglas distintas vía
`crearReglas({ ...overrides })`.
