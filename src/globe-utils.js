/**
 * globe-utils.js — Globe Utility Functions
 * 
 * Ported dari 3d-earth project (TypeScript → JavaScript).
 * Berisi fungsi-fungsi untuk:
 * - Konversi koordinat (longitude/latitude → 3D)
 * - Light pillars (tiang cahaya)
 * - Wave mesh (animasi ripple)
 * - Fly arc (garis terbang melengkung antar kota)
 * - Satellite orbit helpers
 * 
 * Koordinat kota-kota Indonesia untuk data points.
 */

import * as THREE from 'three';

// ============================================================
// INDONESIAN CITY COORDINATES
// ============================================================

/**
 * 10 kota besar di Indonesia.
 * Digunakan untuk menempatkan data points di globe.
 * Akun di-assign ke kota secara berurutan (modulo 10).
 */
export const INDONESIAN_CITIES = [
  { name: 'Jakarta',     N: -6.2088,  E: 106.8456 },
  { name: 'Surabaya',    N: -7.2575,  E: 112.7521 },
  { name: 'Bandung',     N: -6.9175,  E: 107.6191 },
  { name: 'Medan',       N:  3.5952,  E:  98.6722 },
  { name: 'Semarang',    N: -6.9666,  E: 110.4196 },
  { name: 'Makassar',    N: -5.1477,  E: 119.4327 },
  { name: 'Palembang',   N: -2.9761,  E: 104.7754 },
  { name: 'Denpasar',    N: -8.6705,  E: 115.2126 },
  { name: 'Yogyakarta',  N: -7.7956,  E: 110.3695 },
  { name: 'Manado',      N:  1.4748,  E: 124.8421 },
];

// ============================================================
// COORDINATE CONVERSION
// ============================================================

/**
 * Konversi longitude/latitude ke posisi 3D di permukaan bola.
 * 
 * Rumus: Spherical Coordinates
 * - x = R × cos(lat) × cos(lon)
 * - y = R × sin(lat)
 * - z = R × cos(lat) × sin(lon)
 * 
 * @param {number} R - Radius bola
 * @param {number} longitude - Bujur (derajat)
 * @param {number} latitude - Lintang (derajat)
 * @returns {THREE.Vector3}
 */
export function lon2xyz(R, longitude, latitude) {
  let lon = (longitude * Math.PI) / 180;
  const lat = (latitude * Math.PI) / 180;
  lon = -lon; // Koreksi untuk Three.js coordinate system

  const x = R * Math.cos(lat) * Math.cos(lon);
  const y = R * Math.sin(lat);
  const z = R * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

// ============================================================
// LIGHT PILLAR
// ============================================================

/**
 * Buat tiang cahaya vertikal di permukaan bola.
 * Teknik: 2 PlaneGeometry saling berpotongan 90° (billboard cross)
 * sehingga terlihat 3D dari semua sudut pandang.
 * 
 * @param {Object} options
 * @param {number} options.radius - Radius bola
 * @param {number} options.lon - Longitude
 * @param {number} options.lat - Latitude
 * @param {THREE.Texture} options.texture - Light column texture
 * @param {number} options.color - Warna tiang
 * @param {number} [options.height] - Tinggi tiang (relatif terhadap radius)
 */
export function createLightPillar({ radius, lon, lat, texture, color, height }) {
  const h = height || radius * 0.3;
  const geometry = new THREE.PlaneGeometry(radius * 0.05, h);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, h / 2);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: color,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  // Dua plane berpotongan 90° untuk efek billboard
  group.add(mesh, mesh.clone().rotateZ(Math.PI / 2));

  // Posisikan di permukaan bola
  const coord = lon2xyz(radius, lon, lat);
  group.position.set(coord.x, coord.y, coord.z);

  // Orient ke arah radial (menjauh dari pusat bola)
  const coordVec = new THREE.Vector3(coord.x, coord.y, coord.z).normalize();
  const meshNormal = new THREE.Vector3(0, 0, 1);
  group.quaternion.setFromUnitVectors(meshNormal, coordVec);

  return group;
}

// ============================================================
// WAVE MESH (Ripple Effect)
// ============================================================

/**
 * Buat mesh animasi "pulse" (lingkaran yang membesar lalu hilang).
 * 
 * @param {Object} options
 * @param {number} options.radius
 * @param {number} options.lon
 * @param {number} options.lat
 * @param {THREE.Texture} options.texture - Aperture texture
 */
export function createWaveMesh({ radius, lon, lat, texture }) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xe99f68,
    map: texture,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const coord = lon2xyz(radius * 1.001, lon, lat);
  const size = radius * 0.12;
  mesh.scale.set(size, size, size);
  mesh.userData.size = size;
  mesh.userData.scale = Math.random() * 1.0;

  mesh.position.set(coord.x, coord.y, coord.z);
  const coordVec = new THREE.Vector3(coord.x, coord.y, coord.z).normalize();
  const meshNormal = new THREE.Vector3(0, 0, 1);
  mesh.quaternion.setFromUnitVectors(meshNormal, coordVec);

  return mesh;
}

// ============================================================
// POINT MESH (Label base marker)
// ============================================================

/**
 * Buat marker titik di permukaan bola.
 * 
 * @param {Object} options
 * @param {number} options.radius
 * @param {number} options.lon
 * @param {number} options.lat
 * @param {THREE.Material} options.material
 */
export function createPointMesh({ radius, lon, lat, material }) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);

  const coord = lon2xyz(radius * 1.001, lon, lat);
  const size = radius * 0.05;
  mesh.scale.set(size, size, size);
  mesh.position.set(coord.x, coord.y, coord.z);

  const coordVec = new THREE.Vector3(coord.x, coord.y, coord.z).normalize();
  const meshNormal = new THREE.Vector3(0, 0, 1);
  mesh.quaternion.setFromUnitVectors(meshNormal, coordVec);

  return mesh;
}

// ============================================================
// SATELLITE ORBIT HELPERS
// ============================================================

/**
 * Generate titik-titik di sebuah lingkaran.
 * Digunakan untuk orbit satelit.
 * 
 * @param {Object} option
 * @param {number} option.radius - Radius lingkaran
 * @param {number} option.number - Jumlah titik
 * @param {boolean} option.closed - Apakah lingkaran tertutup
 * @returns {Array} Array of [x, y, z] coordinates
 */
export function getCirclePoints({ radius = 10, number = 100, closed = false }) {
  const list = [];
  for (let j = 0; j < 2 * Math.PI - 0.1; j += (2 * Math.PI) / number) {
    list.push([
      parseFloat((Math.cos(j) * radius).toFixed(2)),
      0,
      parseFloat((Math.sin(j) * radius).toFixed(2)),
    ]);
  }
  if (closed) list.push(list[0]);
  return list;
}

/**
 * Buat animated ring (tube geometry dari titik-titik lingkaran).
 * 
 * @param {Object} option
 * @param {Array} option.pointList - Array titik [x,y,z]
 * @param {THREE.Material} option.material
 * @param {number} option.number - Segments
 * @param {number} option.radius - Tube radius
 */
export function createAnimateLine({ pointList, material, number = 50, radius = 1 }) {
  const l = pointList.map((e) => new THREE.Vector3(e[0], e[1], e[2]));
  const curve = new THREE.CatmullRomCurve3(l);
  const tubeGeometry = new THREE.TubeGeometry(curve, number, radius);
  return new THREE.Mesh(tubeGeometry, material);
}

// ============================================================
// FLY ARC (Garis terbang antar kota)
// ============================================================

/**
 * Buat garis terbang melengkung (arc) antara dua titik di permukaan bola.
 * 
 * Algoritma:
 * 1. Konversi lon/lat → 3D coordinates
 * 2. Putar kedua titik ke bidang XOY (flat) agar mudah digambar
 * 3. Gambar arc di bidang XOY
 * 4. Putar kembali arc ke posisi 3D asli
 * 
 * @param {number} radius - Radius bola
 * @param {number} lon1 - Longitude titik awal
 * @param {number} lat1 - Latitude titik awal
 * @param {number} lon2 - Longitude titik akhir
 * @param {number} lat2 - Latitude titik akhir
 * @param {Object} options - { color, flyLineColor, speed }
 */
export function flyArc(radius, lon1, lat1, lon2, lat2, options) {
  const sphereCoord1 = lon2xyz(radius, lon1, lat1);
  const startSphereCoord = new THREE.Vector3(sphereCoord1.x, sphereCoord1.y, sphereCoord1.z);
  const sphereCoord2 = lon2xyz(radius, lon2, lat2);
  const endSphereCoord = new THREE.Vector3(sphereCoord2.x, sphereCoord2.y, sphereCoord2.z);

  const startEndQua = _3Dto2D(startSphereCoord, endSphereCoord);
  const arcline = arcXOY(radius, startEndQua.startPoint, startEndQua.endPoint, options);
  arcline.quaternion.multiply(startEndQua.quaternion);
  return arcline;
}

// --- Private helpers for flyArc ---

function _3Dto2D(startSphere, endSphere) {
  const origin = new THREE.Vector3(0, 0, 0);
  const startDir = startSphere.clone().sub(origin);
  const endDir = endSphere.clone().sub(origin);
  const normal = startDir.clone().cross(endDir).normalize();
  const xoyNormal = new THREE.Vector3(0, 0, 1);
  const quaternion3D_XOY = new THREE.Quaternion().setFromUnitVectors(normal, xoyNormal);

  const startSphereXOY = startSphere.clone().applyQuaternion(quaternion3D_XOY);
  const endSphereXOY = endSphere.clone().applyQuaternion(quaternion3D_XOY);

  const middleV3 = startSphereXOY.clone().add(endSphereXOY).multiplyScalar(0.5);
  const midDir = middleV3.clone().sub(origin).normalize();
  const yDir = new THREE.Vector3(0, 1, 0);
  const quaternionXOY_Y = new THREE.Quaternion().setFromUnitVectors(midDir, yDir);

  const startSpherXOY_Y = startSphereXOY.clone().applyQuaternion(quaternionXOY_Y);
  const endSphereXOY_Y = endSphereXOY.clone().applyQuaternion(quaternionXOY_Y);

  const quaternionInverse = quaternion3D_XOY.clone().invert().multiply(quaternionXOY_Y.clone().invert());

  return {
    quaternion: quaternionInverse,
    startPoint: startSpherXOY_Y,
    endPoint: endSphereXOY_Y,
  };
}

function arcXOY(radius, startPoint, endPoint, options) {
  const middleV3 = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  const dir = middleV3.clone().normalize();
  const earthRadianAngle = radianAOB(startPoint, endPoint, new THREE.Vector3(0, 0, 0));
  const arcTopCoord = dir.multiplyScalar(radius + earthRadianAngle * radius * 0.2);
  const flyArcCenter = threePointCenter(startPoint, endPoint, arcTopCoord);
  const flyArcR = Math.abs(flyArcCenter.y - arcTopCoord.y);

  const flyRadianAngle = radianAOB(startPoint, new THREE.Vector3(0, -1, 0), flyArcCenter);
  const startAngle = -Math.PI / 2 + flyRadianAngle;
  const endAngle = Math.PI - startAngle;

  const arcline = circleLine(flyArcCenter.x, flyArcCenter.y, flyArcR, startAngle, endAngle, options.color);
  arcline.center = flyArcCenter;
  arcline.topCoord = arcTopCoord;

  const flyAngle = (endAngle - startAngle) / 7;
  const flyLineMesh = createFlyLineMesh(flyArcR, startAngle, startAngle + flyAngle, options.flyLineColor);
  flyLineMesh.position.y = flyArcCenter.y;
  arcline.add(flyLineMesh);

  flyLineMesh.flyEndAngle = endAngle - startAngle - flyAngle;
  flyLineMesh.startAngle = startAngle;
  flyLineMesh.AngleZ = flyLineMesh.flyEndAngle * Math.random();

  arcline.userData.flyLine = flyLineMesh;

  return arcline;
}

function createFlyLineMesh(radius, startAngle, endAngle, color) {
  const geometry = new THREE.BufferGeometry();
  const arc = new THREE.ArcCurve(0, 0, radius, startAngle, endAngle, false);
  const pointsArr = arc.getSpacedPoints(100);
  geometry.setFromPoints(pointsArr);

  const percentArr = [];
  for (let i = 0; i < pointsArr.length; i++) {
    percentArr.push(i / pointsArr.length);
  }
  geometry.setAttribute('percent', new THREE.BufferAttribute(new Float32Array(percentArr), 1));

  const colorArr = [];
  for (let i = 0; i < pointsArr.length; i++) {
    const color1 = new THREE.Color(0xec8f43);
    const color2 = new THREE.Color(0xf3ae76);
    const c = color1.lerp(color2, i / pointsArr.length);
    colorArr.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorArr), 3));

  const material = new THREE.PointsMaterial({
    size: 1.3,
    transparent: true,
    depthWrite: false,
  });

  material.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'attribute float percent;\nvoid main() {'
    );
    shader.vertexShader = shader.vertexShader.replace(
      'gl_PointSize = size;',
      'gl_PointSize = percent * size;'
    );
  };

  const flyLine = new THREE.Points(geometry, material);
  material.color = new THREE.Color(color);
  flyLine.name = 'flyLine';
  return flyLine;
}

function radianAOB(A, B, O) {
  const dir1 = A.clone().sub(O).normalize();
  const dir2 = B.clone().sub(O).normalize();
  const cosAngle = dir1.clone().dot(dir2);
  return Math.acos(cosAngle);
}

function circleLine(x, y, r, startAngle, endAngle, color) {
  const geometry = new THREE.BufferGeometry();
  const arc = new THREE.ArcCurve(x, y, r, startAngle, endAngle, false);
  const points = arc.getSpacedPoints(80);
  geometry.setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color || 0xd18547,
  });
  return new THREE.Line(geometry, material);
}

function threePointCenter(p1, p2, p3) {
  const L1 = p1.lengthSq();
  const L2 = p2.lengthSq();
  const L3 = p3.lengthSq();
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const S = x1 * y2 + x2 * y3 + x3 * y1 - x1 * y3 - x2 * y1 - x3 * y2;
  const x = (L2 * y3 + L1 * y2 + L3 * y1 - L2 * y1 - L3 * y2 - L1 * y3) / S / 2;
  const y = (L3 * x2 + L2 * x1 + L1 * x3 - L1 * x2 - L2 * x3 - L3 * x1) / S / 2;
  return new THREE.Vector3(x, y, 0);
}
