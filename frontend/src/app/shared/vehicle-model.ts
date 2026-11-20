import type * as ThreeNS from 'three';

import type { TipoVehiculo } from '../core/models';

/**
 * Vehículos 3D procedurales: se construyen con geometría (siluetas extruidas + ruedas),
 * por eso son genéricos por tipo y no representan ninguna marca ni modelo real.
 * Three.js se carga de forma diferida, así que este archivo solo importa sus tipos.
 */
export type Three = typeof ThreeNS;
type Punto = [number, number];

interface Parte {
  poli: Punto[];
  ancho: number;
  rol: 'cuerpo' | 'vidrio';
}

interface Perfil {
  partes: Parte[];
  ruedas: { x: number; r: number }[];
  anchoRueda: number;
  /** Distancia lateral de las ruedas respecto al eje (0 = una sola rueda central, como en la moto). */
  semiVia: number;
  luces: { x: number; y: number; frontal: boolean }[];
}

// Siluetas laterales (x = largo, y = alto). El frente del vehículo mira hacia +x.
const PERFILES: Record<TipoVehiculo, Perfil> = {
  AUTOMOVIL: {
    partes: [
      {
        rol: 'cuerpo',
        ancho: 1.8,
        poli: [[-2.3, 0.42], [-2.32, 0.8], [-1.5, 0.98], [1.25, 0.98], [2.05, 0.82], [2.32, 0.6], [2.3, 0.42]],
      },
      { rol: 'vidrio', ancho: 1.66, poli: [[-1.25, 0.96], [-0.72, 1.42], [0.55, 1.42], [1.15, 0.96]] },
    ],
    ruedas: [{ x: -1.45, r: 0.38 }, { x: 1.45, r: 0.38 }],
    anchoRueda: 0.3,
    semiVia: 0.92,
    luces: [{ x: 2.3, y: 0.7, frontal: true }, { x: -2.32, y: 0.78, frontal: false }],
  },
  CAMIONETA: {
    partes: [
      {
        rol: 'cuerpo',
        ancho: 1.95,
        poli: [[-2.45, 0.44], [-2.45, 1.02], [0.6, 1.02], [1.25, 0.96], [2.35, 0.88], [2.48, 0.6], [2.45, 0.44]],
      },
      { rol: 'vidrio', ancho: 1.8, poli: [[-0.55, 1.0], [-0.4, 1.62], [0.62, 1.62], [1.18, 1.0]] },
    ],
    ruedas: [{ x: -1.5, r: 0.44 }, { x: 1.55, r: 0.44 }],
    anchoRueda: 0.34,
    semiVia: 1.0,
    luces: [{ x: 2.47, y: 0.74, frontal: true }, { x: -2.45, y: 0.86, frontal: false }],
  },
  CAMION: {
    partes: [
      { rol: 'cuerpo', ancho: 1.9, poli: [[-3.4, 0.5], [-3.4, 0.85], [2.5, 0.85], [2.55, 0.5]] },
      { rol: 'cuerpo', ancho: 2.1, poli: [[-3.4, 0.85], [-3.4, 2.75], [0.7, 2.75], [0.7, 0.85]] },
      { rol: 'cuerpo', ancho: 2.0, poli: [[0.95, 0.85], [0.95, 2.25], [1.8, 2.4], [2.5, 1.5], [2.55, 0.85]] },
      { rol: 'vidrio', ancho: 2.06, poli: [[1.15, 1.5], [1.15, 2.15], [1.75, 2.28], [2.2, 1.5]] },
    ],
    ruedas: [{ x: -2.6, r: 0.5 }, { x: -1.6, r: 0.5 }, { x: 1.8, r: 0.5 }],
    anchoRueda: 0.36,
    semiVia: 1.0,
    luces: [{ x: 2.55, y: 0.95, frontal: true }, { x: -3.4, y: 1.0, frontal: false }],
  },
  BUS: {
    partes: [
      { rol: 'cuerpo', ancho: 2.1, poli: [[-3.5, 0.5], [-3.5, 2.6], [2.9, 2.6], [3.5, 1.9], [3.5, 0.5]] },
      { rol: 'vidrio', ancho: 2.14, poli: [[-3.1, 1.35], [-3.1, 2.25], [2.8, 2.25], [3.2, 1.7], [3.2, 1.35]] },
    ],
    ruedas: [{ x: -2.3, r: 0.5 }, { x: 2.2, r: 0.5 }],
    anchoRueda: 0.36,
    semiVia: 1.02,
    luces: [{ x: 3.5, y: 0.85, frontal: true }, { x: -3.5, y: 0.95, frontal: false }],
  },
  MOTOCICLETA: {
    partes: [
      {
        rol: 'cuerpo',
        ancho: 0.34,
        poli: [[-0.95, 0.7], [-0.85, 1.0], [-0.1, 1.08], [0.45, 1.14], [0.8, 0.92], [0.55, 0.68], [-0.2, 0.62]],
      },
      { rol: 'cuerpo', ancho: 0.28, poli: [[-1.15, 0.95], [-0.55, 1.03], [-0.2, 1.1], [-0.2, 0.9], [-1.15, 0.86]] },
    ],
    ruedas: [{ x: -1.0, r: 0.42 }, { x: 1.0, r: 0.42 }],
    anchoRueda: 0.14,
    semiVia: 0,
    luces: [{ x: 0.98, y: 1.2, frontal: true }, { x: -1.18, y: 0.92, frontal: false }],
  },
};

export interface Vehiculo3D {
  grupo: ThreeNS.Group;
  materialCuerpo: ThreeNS.MeshPhysicalMaterial;
  materialVidrio: ThreeNS.MeshPhysicalMaterial;
  materialesBorde: ThreeNS.LineBasicMaterial[];
  /** Mitad del largo del vehículo (para dimensionar la plataforma). */
  semiLargo: number;
}

export function construirVehiculo(T: Three, tipo: TipoVehiculo): Vehiculo3D {
  const perfil = PERFILES[tipo];
  const grupo = new T.Group();

  const materialCuerpo = new T.MeshPhysicalMaterial({
    color: 0x12305f,
    metalness: 0.8,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const materialVidrio = new T.MeshPhysicalMaterial({
    color: 0x00c8e8,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.28,
  });
  const materialesBorde: ThreeNS.LineBasicMaterial[] = [];

  let minX = Infinity;
  let maxX = -Infinity;

  for (const parte of perfil.partes) {
    const forma = new T.Shape();
    parte.poli.forEach(([x, y], i) => {
      if (i === 0) forma.moveTo(x, y);
      else forma.lineTo(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
    forma.closePath();

    const geometria = new T.ExtrudeGeometry(forma, {
      depth: parte.ancho,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    geometria.translate(0, 0, -parte.ancho / 2);

    const malla = new T.Mesh(geometria, parte.rol === 'cuerpo' ? materialCuerpo : materialVidrio);
    malla.userData['rol'] = parte.rol;

    const materialBorde = new T.LineBasicMaterial({
      color: parte.rol === 'cuerpo' ? 0x00c8e8 : 0x9cc4ff,
      transparent: true,
      opacity: parte.rol === 'cuerpo' ? 0.5 : 0.35,
    });
    materialesBorde.push(materialBorde);
    malla.add(new T.LineSegments(new T.EdgesGeometry(geometria, 28), materialBorde));
    grupo.add(malla);
  }

  // Ruedas
  const goma = new T.MeshStandardMaterial({ color: 0x05090f, roughness: 0.9 });
  const aro = new T.MeshBasicMaterial({ color: 0x00c8e8 });
  const cubo = new T.MeshStandardMaterial({ color: 0x9fb0cc, metalness: 0.9, roughness: 0.3 });
  const posicionesZ = perfil.semiVia === 0 ? [0] : [-perfil.semiVia, perfil.semiVia];
  for (const rueda of perfil.ruedas) {
    for (const z of posicionesZ) {
      const g = new T.Group();
      const llanta = new T.Mesh(new T.CylinderGeometry(rueda.r, rueda.r, perfil.anchoRueda, 32), goma);
      llanta.rotation.x = Math.PI / 2;
      g.add(llanta);
      for (const lado of [1, -1]) {
        const anillo = new T.Mesh(new T.TorusGeometry(rueda.r * 0.62, rueda.r * 0.05, 8, 40), aro);
        anillo.position.z = (lado * perfil.anchoRueda) / 2 + lado * 0.002;
        g.add(anillo);
      }
      const eje = new T.Mesh(new T.CylinderGeometry(rueda.r * 0.28, rueda.r * 0.28, perfil.anchoRueda + 0.03, 20), cubo);
      eje.rotation.x = Math.PI / 2;
      g.add(eje);
      g.position.set(rueda.x, rueda.r, z);
      grupo.add(g);
    }
  }

  // Luces
  const luzDelantera = new T.MeshBasicMaterial({ color: 0xe8fbff });
  const luzTrasera = new T.MeshBasicMaterial({ color: 0xff4d5e });
  const zLuces = perfil.semiVia === 0 ? [0] : [-perfil.semiVia * 0.62, perfil.semiVia * 0.62];
  for (const luz of perfil.luces) {
    for (const z of zLuces) {
      const caja = new T.Mesh(
        new T.BoxGeometry(0.07, 0.12, perfil.semiVia === 0 ? 0.18 : 0.42),
        luz.frontal ? luzDelantera : luzTrasera,
      );
      caja.position.set(luz.x, luz.y, z);
      grupo.add(caja);
    }
  }

  // Detalles de la motocicleta: horquilla y manillar
  if (tipo === 'MOTOCICLETA') {
    const metal = new T.MeshStandardMaterial({ color: 0x9fb0cc, metalness: 0.9, roughness: 0.3 });
    const horquilla = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.0, 10), metal);
    horquilla.rotation.z = -0.38;
    horquilla.position.set(0.82, 0.95, 0);
    grupo.add(horquilla);
    const manillar = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.78, 10), metal);
    manillar.rotation.x = Math.PI / 2;
    manillar.position.set(0.7, 1.42, 0);
    grupo.add(manillar);
  }

  return { grupo, materialCuerpo, materialVidrio, materialesBorde, semiLargo: Math.max(Math.abs(minX), Math.abs(maxX)) };
}

/** Plataforma circular iluminada con marcas de goniómetro, sobre la que gira el vehículo. */
export function construirPlataforma(T: Three, radio: number): ThreeNS.Group {
  const grupo = new T.Group();

  const disco = new T.Mesh(
    new T.CylinderGeometry(radio, radio, 0.06, 96),
    new T.MeshStandardMaterial({ color: 0x0b1a30, metalness: 0.6, roughness: 0.35 }),
  );
  disco.position.y = -0.03;
  grupo.add(disco);

  const anilloExterior = new T.Mesh(
    new T.RingGeometry(radio - 0.05, radio, 128),
    new T.MeshBasicMaterial({ color: 0x00c8e8, transparent: true, opacity: 0.85, side: T.DoubleSide }),
  );
  anilloExterior.rotation.x = -Math.PI / 2;
  anilloExterior.position.y = 0.004;
  grupo.add(anilloExterior);

  const anilloInterior = new T.Mesh(
    new T.RingGeometry(radio * 0.7 - 0.02, radio * 0.7, 128),
    new T.MeshBasicMaterial({ color: 0x8155e8, transparent: true, opacity: 0.4, side: T.DoubleSide }),
  );
  anilloInterior.rotation.x = -Math.PI / 2;
  anilloInterior.position.y = 0.004;
  grupo.add(anilloInterior);

  // Marcas cada 5° (más largas cada 30°)
  const puntos: ThreeNS.Vector3[] = [];
  for (let grados = 0; grados < 360; grados += 5) {
    const a = (grados * Math.PI) / 180;
    const largo = grados % 30 === 0 ? 0.26 : 0.12;
    const r1 = radio + 0.1;
    const r2 = r1 + largo;
    puntos.push(new T.Vector3(Math.cos(a) * r1, 0.004, Math.sin(a) * r1));
    puntos.push(new T.Vector3(Math.cos(a) * r2, 0.004, Math.sin(a) * r2));
  }
  grupo.add(
    new T.LineSegments(
      new T.BufferGeometry().setFromPoints(puntos),
      new T.LineBasicMaterial({ color: 0x6aa3ff, transparent: true, opacity: 0.5 }),
    ),
  );

  // Resplandor azul bajo el vehículo
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext('2d');
  if (ctx) {
    const gradiente = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradiente.addColorStop(0, 'rgba(42,123,239,0.55)');
    gradiente.addColorStop(0.5, 'rgba(7,91,206,0.18)');
    gradiente.addColorStop(1, 'rgba(7,17,31,0)');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, 256, 256);
  }
  const brillo = new T.Mesh(
    new T.PlaneGeometry(radio * 2.6, radio * 2.6),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(lienzo),
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  brillo.rotation.x = -Math.PI / 2;
  brillo.position.y = 0.001;
  grupo.add(brillo);

  return grupo;
}

/** Escena base: reflejos de estudio e iluminación azul / violeta / cian. */
export function prepararEscena(
  T: Three,
  renderer: ThreeNS.WebGLRenderer,
  EntornoSala: new () => ThreeNS.Scene,
): ThreeNS.Scene {
  const escena = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new EntornoSala(), 0.04).texture;
  escena.environmentIntensity = 0.55;
  pmrem.dispose();

  escena.add(new T.HemisphereLight(0x6aa3ff, 0x07111f, 0.6));

  const principal = new T.DirectionalLight(0x9cc4ff, 1.5);
  principal.position.set(4, 6, 5);
  escena.add(principal);

  const violeta = new T.PointLight(0x8155e8, 45, 16);
  violeta.position.set(-5, 3, -4);
  escena.add(violeta);

  const cian = new T.PointLight(0x00c8e8, 35, 14);
  cian.position.set(4, 1.5, -4);
  escena.add(cian);

  return escena;
}

/**
 * Coloca la cámara para ver el objeto completo. El objeto se mide sin rotación
 * para que el encuadre no cambie mientras gira.
 */
export function encuadrar(
  T: Three,
  camara: ThreeNS.PerspectiveCamera,
  objeto: ThreeNS.Object3D,
  radioMinimo = 0,
  elevacion = 0.24,
): void {
  const rotacion = objeto.rotation.y;
  objeto.rotation.y = 0;
  objeto.updateMatrixWorld(true);
  const caja = new T.Box3().setFromObject(objeto);
  objeto.rotation.y = rotacion;
  objeto.updateMatrixWorld(true);

  const tamano = caja.getSize(new T.Vector3());
  const radio = Math.max(
    Math.sqrt(Math.pow(Math.max(tamano.x, tamano.z) / 2, 2) + Math.pow(tamano.y / 2, 2)),
    radioMinimo,
  );
  const centro = new T.Vector3(0, (caja.min.y + caja.max.y) / 2, 0);

  const fovV = (camara.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camara.aspect);
  const fov = Math.min(fovV, fovH);
  const distancia = radio / Math.sin(fov / 2);

  camara.position.set(centro.x, centro.y + distancia * elevacion, centro.z + distancia);
  camara.near = distancia / 50;
  camara.far = distancia * 12;
  camara.lookAt(centro);
  camara.updateProjectionMatrix();
}

/** Libera la memoria de GPU de un objeto 3D. */
export function liberar(objeto: ThreeNS.Object3D): void {
  objeto.traverse((o) => {
    const malla = o as ThreeNS.Mesh;
    malla.geometry?.dispose();
    const material = malla.material as ThreeNS.Material | ThreeNS.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => liberarMaterial(m));
    else if (material) liberarMaterial(material);
  });
}

function liberarMaterial(material: ThreeNS.Material): void {
  (material as ThreeNS.MeshBasicMaterial).map?.dispose();
  material.dispose();
}
