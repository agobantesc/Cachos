import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Mesa } from "../Mesa";
import { App } from "../App";
import { TransporteLocal } from "../transporte";

// Smoke tests del UI: renderizan los componentes con el motor real (sin navegador)
// para garantizar que el árbol de React se dibuja sin errores y muestra lo esperado.

describe("App (inicio)", () => {
  it("renderiza la home con las dos formas de jugar", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Cachos");
    expect(html).toContain("Jugar solo");
    expect(html).toContain("Mesa en línea");
    expect(html).toContain("Reglas de la Asociación");
  });
});

describe("Mesa (en juego)", () => {
  function mesaEnJuego() {
    const t = new TransporteLocal([
      { id: "p0", nombre: "Ana" },
      { id: "p1", nombre: "Beto" },
      { id: "p2", nombre: "Cata" },
    ]);
    void t.iniciar();
    void t.apostar({ cantidad: 2, pinta: 5 });
    return t;
  }

  it("muestra los vasos, la apuesta vigente y la mano propia", () => {
    const t = mesaEnJuego();
    const html = renderToStaticMarkup(<Mesa snap={t.instantanea()} transporte={t} salir={() => {}} />);
    expect(html).toContain("Ana");
    expect(html).toContain("Beto");
    expect(html).toContain("Cata");
    expect(html).toContain("quinas"); // "2 quinas"
    expect(html).toContain("Tu mano");
    expect(html).toContain("dado"); // se renderizan dados (clases .dado)
  });

  it("renderiza la revelación tras un dudo", () => {
    const t = mesaEnJuego();
    void t.dudar(); // Cata duda la apuesta de Beto
    const html = renderToStaticMarkup(<Mesa snap={t.instantanea()} transporte={t} salir={() => {}} />);
    expect(html).toContain("Revelación");
    expect(html).toContain("cuenta"); // muestra el conteo por jugador
  });
});
