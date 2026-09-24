#!/usr/bin/env python3
"""Genera los pines de mapa (assets/images/mapPins/) para cada stop_type.

Por que existe este script: GoogleMapsMarker (expo-maps v57, alpha) no tiene
prop de color ni de tinte -- solo acepta un `icon` que es una imagen ya
horneada con su color final (ver AppleMapsMarker.tintColor, que si existe
pero solo en iOS). Para que Android y iOS se vean igual hay que usar los
mismos PNG con color horneado en ambas plataformas. Nueve binarios (3 tipos x
3 densidades) generados a mano quedarian como "magia" que nadie puede
reproducir; este script los recrea de forma determinista en un comando, asi
que un cambio de color de marca es una edicion de PIN_TYPES + un re-run, no
una sesion de Figma.

Forma del pin: gota clasica de mapa (circulo con una cola triangular que
termina en punta). La punta se calcula con geometria exacta (tangentes desde
un punto externo a un circulo), no a ojo, para que quede simetrica en las
tres densidades. El borde se dibuja como una segunda copia del mismo pin,
mas chica (radio y largo de cola reducidos por el ancho del borde) y del
mismo centro, pintada encima -- el anillo que sobra alrededor es el borde.

Como correrlo:
    python3 -m venv /tmp/pinvenv && /tmp/pinvenv/bin/pip install Pillow
    /tmp/pinvenv/bin/python3 scripts/generate-map-pins.py

(O cualquier Python 3 con Pillow instalado -- no hace falta el venv si ya lo
tenes disponible globalmente.)
"""

from __future__ import annotations

import math
import os
from typing import List, Tuple

from PIL import Image, ImageDraw

# Geometria del pin en puntos @1x. `R` es el radio de la cabeza (circulo),
# `L` es la distancia del centro de la cabeza a la punta de la cola -- L > R
# para que la cola sobresalga del circulo. `STROKE` es el ancho del borde.
#
# 1.5x del tamaño original (24x25): a 24pt los pines se perdian entre los
# iconos de lugares de Google Maps. La punta tiene que seguir cayendo justo en
# el borde inferior del lienzo (CENTER_Y + TIP_DISTANCE == CANVAS_HEIGHT),
# porque `PIN_ANCHOR` en route-map.tsx ancla el pixel (0.5, 1).
CANVAS_WIDTH = 36.0
CANVAS_HEIGHT = 38.0
CENTER_X = 18.0
CENTER_Y = 14.0
HEAD_RADIUS = 12.0
TIP_DISTANCE = 24.0
STROKE_WIDTH = 3.0

# Supersampling: se dibuja a esta cantidad de veces la resolucion final y
# se reduce con LANCZOS, que es el filtro que Pillow recomienda para
# downsizing de alta calidad -- asi el contorno de la gota (circulo + rectas
# tangentes) sale antialiaseado en vez de dentado.
SUPERSAMPLE = 4

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images', 'mapPins')

# Colores del wireframe (Ruling del controlador sobre los PNG de los pines).
PIN_TYPES = {
    'pin-visita': {'fill': '#26B003', 'border': '#068802'},
    'pin-despacho': {'fill': '#2A6FDB', 'border': '#1C4F9C'},
    'pin-cobro': {'fill': '#D98C00', 'border': '#8A5800'},
}

# Nombre de archivo -> factor de escala, siguiendo el patron de
# assets/images/tabIcons/ (home.png @1x, home@2x.png, home@3x.png).
DENSITIES = {'': 1, '@2x': 2, '@3x': 3}


def pin_outline(center_x: float, center_y: float, radius: float, tip_distance: float) -> List[Tuple[float, float]]:
    """Calcula el contorno de la gota como poligono: arco largo del circulo
    (todo menos el tramo que da hacia la cola) + la punta.

    Los puntos de tangencia entre el circulo y las rectas que van a la punta
    se resuelven con el angulo exacto `phi = acos(radius / tip_distance)`
    (geometria de tangente desde un punto externo a un circulo). Sin este
    calculo la union circulo+triangulo queda con un quiebre visible en vez de
    una curva continua.
    """
    if tip_distance <= radius:
        raise ValueError('tip_distance debe ser mayor que radius para que la cola sobresalga')

    phi = math.degrees(math.acos(radius / tip_distance))

    points: List[Tuple[float, float]] = []
    angle = 90 + phi
    end = 90 - phi + 360
    step = 4.0
    while angle <= end:
        rad = math.radians(angle)
        points.append((center_x + radius * math.cos(rad), center_y + radius * math.sin(rad)))
        angle += step

    # La punta de la cola. PIL cierra el poligono solo (ultimo punto -> primero),
    # asi que agregarla acá alcanza para las dos rectas tangentes.
    points.append((center_x, center_y + tip_distance))
    return points


def render_pin(fill: str, border: str, scale: int) -> Image.Image:
    factor = scale * SUPERSAMPLE
    canvas = Image.new('RGBA', (round(CANVAS_WIDTH * factor), round(CANVAS_HEIGHT * factor)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    cx = CENTER_X * factor
    cy = CENTER_Y * factor

    outer = pin_outline(cx, cy, HEAD_RADIUS * factor, TIP_DISTANCE * factor)
    draw.polygon(outer, fill=border)

    inner_radius = (HEAD_RADIUS - STROKE_WIDTH) * factor
    inner_tip = (TIP_DISTANCE - STROKE_WIDTH) * factor
    inner = pin_outline(cx, cy, inner_radius, inner_tip)
    draw.polygon(inner, fill=fill)

    target_size = (round(CANVAS_WIDTH * scale), round(CANVAS_HEIGHT * scale))
    return canvas.resize(target_size, Image.LANCZOS)


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for name, colors in PIN_TYPES.items():
        for suffix, scale in DENSITIES.items():
            image = render_pin(colors['fill'], colors['border'], scale)
            out_path = os.path.join(OUTPUT_DIR, f'{name}{suffix}.png')
            image.save(out_path)
            print(f'{out_path} ({image.width}x{image.height})')


if __name__ == '__main__':
    main()
