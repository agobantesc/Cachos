# Reglas del Cacho — fuente de verdad del motor

Este documento define EXACTAMENTE las reglas que implementa el motor (`src/engine`).
Es la "fuente de verdad": si una regla cambia, se cambia acá y en el código.

> ⚠️ **Marcadas con 🟡 hay supuestos que conviene confirmar con el grupo.** El
> código ya funciona con estos defaults; cambiarlos es de una línea en
> `src/engine/config.ts` o `src/engine/bids.ts`.

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
- **Normal → Ases:** necesitas al menos **⌈cantidad/2⌉** ases. Ej: tras *"6 quinas"*
  → *"3 ases"*. 🟡 *(convención estilo Perudo)*
- **Ases → Normal:** necesitas al menos **cantidad·2 + 1**. Ej: tras *"3 ases"* →
  *"7 de cualquier pinta"*. 🟡
- **Ases → Ases:** subes la cantidad de ases.

## Acciones por turno

- **Apostar / Subir:** declarar una apuesta válida.
- **Dudar:** "no hay tantos". Se revela la mesa y se cuenta la pinta de la apuesta:
  - cantidad real **≥** declarada → la apuesta era buena → **pierde el dudador**.
  - cantidad real **<** declarada → **pierde el apostador**.
- **Calzar:** "es exactamente esa cantidad". Se revela:
  - exacto → el calzador **recupera un dado** (hasta 5). 🟡
  - no exacto → el calzador **pierde un dado**.

El perdedor de la ronda pierde **1 dado** (salvo la siciliana). Quien se queda en
**0 dados queda eliminado**. Gana el último en pie.

🟡 **Quién abre la siguiente ronda:** el perdedor de la ronda (si calza acertando,
abre el calzador). Si el perdedor quedó eliminado, abre el siguiente activo.

## Variantes de la casa (las que pediste)

### 1. Obligado cerrado
Cuando un jugador queda con **1 dado** y le toca **abrir** la ronda, ésta es de
**obligado** y **cerrada**: los demás juegan **a ciegas** (no ven sus dados),
**salvo** quien también tenga 1 dado, que sí ve el suyo.

- 🟡 Implementado: en ronda cerrada, **un jugador ve sus dados sólo si tiene
  exactamente 1 dado** (incluido el obligado). Con 2+ dados, a ciegas.
- 🟡 Implementado: el obligado se gatilla **la primera vez** que el jugador abre con
  1 dado (`yaJugoObligado`). ¿Debe ser cada vez que abra con 1 dado? Fácil de cambiar.

### 2. Ases no comodín en obligado
En la ronda de obligado, **el As NO es comodín**: cuenta sólo como pinta 1.

### 3. La siciliana
Si un jugador **duda de inmediato** la **primera apuesta de la ronda** (la del
abridor), **el perdedor pierde 2 dados** en vez de 1. Aplica sea quien sea el
perdedor (el apostador o el dudador).

## Resumen de supuestos a confirmar (🟡)

1. **Conversión de ases** al subir (⌈n/2⌉ para entrar; n·2+1 para salir). ¿Tu grupo
   usa otra fórmula?
2. **Calzo:** ¿se permite siempre? ¿recupera dado al acertar? ¿hay tope o condición
   (p.ej. sólo cuando quedan pocos dados)?
3. **Obligado:** ¿lo gatilla sólo la primera vez con 1 dado, o siempre? ¿El obligado
   ve su propio dado?
4. **Quién abre** la siguiente ronda (asumido: el perdedor).
5. **Primer abridor** de la partida (asumido: el primer asiento; podría ser al azar).
