#!/usr/bin/env python3
"""Genera los pines de mapa (assets/images/mapPins/) para cada stop_type.

Por que existe este script: GoogleMapsMarker (expo-maps v57, alpha) no tiene
prop de color ni de tinte -- solo acepta un `icon` que es una imagen ya
horneada con su color final (ver AppleMapsMarker.tintColor, que si existe
pero solo en iOS). Para que Android y iOS se vean igual hay que usar los
mismos PNG con color horneado en ambas plataformas. Doce binarios (4 pines x
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
    'pin-visita': {'fill': '#26B003', 'border': '#068802', 'style': 'solid'},
    'pin-despacho': {'fill': '#2A6FDB', 'border': '#1C4F9C', 'style': 'solid'},
    'pin-cobro': {'fill': '#D98C00', 'border': '#8A5800', 'style': 'solid'},
    # PCRM-49. Un prospecto no es un tipo de parada mas: es un destino que
    # todavia no es cliente, y el vendedor tiene que poder distinguirlo de un
    # vistazo. Por eso sale de la escala verde/azul/ambar (violeta) y va hueco
    # con el contorno punteado, el mismo lenguaje que el badge "Extra" de la
    # tarjeta usa para "esto no es parte de lo planificado".
    'pin-prospecto': {'fill': '#FFFFFF', 'border': '#6B3FA0', 'style': 'dashed'},
}

# Largo de cada guion y del hueco entre guiones, en puntos @1x, medidos sobre
# el contorno. El guion es mas largo que el hueco a proposito: con 3.0/2.4 la
# silueta se leia como una hilera de cuentas y la punta de la gota -- que es
# justo lo que marca la ubicacion -- quedaba deshecha. Valores mas chicos que
# estos se empastan al reducir a @1x.
DASH_LENGTH = 4.2
DASH_GAP = 1.8

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


def draw_dashed_outline(
    draw: ImageDraw.ImageDraw,
    points: List[Tuple[float, float]],
    color: str,
    width: float,
    dash_length: float,
    dash_gap: float,
) -> None:
    """Recorre el contorno cerrado y pinta guiones alternados.

    `pin_outline` devuelve los vertices de un poligono cerrado, asi que el
    recorrido se hace por longitud de arco acumulada y no por indice: los
    puntos del arco del circulo estan mucho mas juntos que los de las rectas
    tangentes, y repartir los guiones por indice dejaria la cola con guiones
    larguisimos y la cabeza con guiones diminutos.

    `dash_length` y `dash_gap` llegan ya escalados al lienzo (supersampling
    incluido); esta funcion no sabe nada de densidades.
    """
    cycle = dash_length + dash_gap
    closed = points + [points[0]]
    travelled = 0.0

    for start_pt, end_pt in zip(closed, closed[1:]):
        seg_dx = end_pt[0] - start_pt[0]
        seg_dy = end_pt[1] - start_pt[1]
        seg_len = math.hypot(seg_dx, seg_dy)
        if seg_len == 0:
            continue

        # Dos guardas de punto flotante, las dos necesarias:
        #
        #  - `epsilon` corta el segmento cuando `pos` ya llego practicamente al
        #    final; sin el, `pos` se le acerca asintoticamente y llega un punto
        #    donde `pos + step == pos`.
        #  - `phase` se redondea a 0 cuando el modulo lo deja a una fraccion
        #    infima por debajo del ciclo (visto: phase = 21.599999999999994 con
        #    cycle = 21.6). Sin esto `remaining` sale ~7e-15, el paso es cero y
        #    el bucle se cuelga a mitad del segmento, no al final.
        epsilon = seg_len * 1e-9
        phase_epsilon = cycle * 1e-9
        pos = 0.0
        while pos < seg_len - epsilon:
            # Donde cae este tramo dentro del ciclo guion+hueco.
            phase = (travelled + pos) % cycle
            if cycle - phase < phase_epsilon:
                phase = 0.0
            inside_dash = phase < dash_length
            remaining = (dash_length - phase) if inside_dash else (cycle - phase)
            # `phase` puede caer a una fraccion infima por debajo de cualquiera
            # de los dos bordes (el del guion y el del ciclo), y ahi `remaining`
            # sale ~1e-15: el paso es cero y el bucle se cuelga a mitad del
            # segmento. Saltar al tramo siguiente es lo correcto -- un guion de
            # 1e-15 no se ve de todos modos.
            if remaining < phase_epsilon:
                remaining = dash_gap if inside_dash else dash_length
                inside_dash = not inside_dash
            step = min(remaining, seg_len - pos)

            if inside_dash:
                t0 = pos / seg_len
                t1 = (pos + step) / seg_len
                draw.line(
                    [
                        (start_pt[0] + seg_dx * t0, start_pt[1] + seg_dy * t0),
                        (start_pt[0] + seg_dx * t1, start_pt[1] + seg_dy * t1),
                    ],
                    fill=color,
                    width=max(1, round(width)),
                )

            pos += step

        travelled += seg_len


def render_pin(fill: str, border: str, scale: int, style: str = 'solid') -> Image.Image:
    factor = scale * SUPERSAMPLE
    canvas = Image.new('RGBA', (round(CANVAS_WIDTH * factor), round(CANVAS_HEIGHT * factor)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    cx = CENTER_X * factor
    cy = CENTER_Y * factor

    outer = pin_outline(cx, cy, HEAD_RADIUS * factor, TIP_DISTANCE * factor)

    if style == 'dashed':
        # Hueco: primero el relleno completo, despues el contorno punteado
        # encima. Dibujar el borde macizo y taparlo (como hace la rama solida)
        # no sirve aca, porque los huecos entre guiones tienen que dejar ver
        # el mapa, no el relleno.
        draw.polygon(outer, fill=fill)
        draw_dashed_outline(
            draw,
            outer,
            border,
            STROKE_WIDTH * factor,
            DASH_LENGTH * factor,
            DASH_GAP * factor,
        )
    else:
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
            image = render_pin(colors['fill'], colors['border'], scale, colors['style'])
            out_path = os.path.join(OUTPUT_DIR, f'{name}{suffix}.png')
            image.save(out_path)
            print(f'{out_path} ({image.width}x{image.height})')


if __name__ == '__main__':
    main()
