import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geoPath, geoOrthographic } from 'd3-geo'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import worldData from '../data/world.json'
import chinaData from '../data/china-provinces.json'

const GLOBE_RADIUS = 1
const LINE_HEIGHT = 0.001

// Convert lat/lon to 3D coordinates on sphere
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

// Create line geometry from coordinates array
function createLineFromCoords(
  coords: number[][],
  radius: number,
  isChina: boolean
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const r = radius + (isChina ? LINE_HEIGHT * 2 : LINE_HEIGHT)

  for (const coord of coords) {
    const [lon, lat] = coord
    points.push(latLonToVector3(lat, lon, r))
  }

  return points
}

// Process GeoJSON geometry to get all line segments
function processGeometry(
  geometry: Geometry,
  radius: number,
  isChina: boolean
): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = []

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      lines.push(createLineFromCoords(ring as number[][], radius, isChina))
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        lines.push(createLineFromCoords(ring as number[][], radius, isChina))
      }
    }
  } else if (geometry.type === 'LineString') {
    lines.push(createLineFromCoords(geometry.coordinates as number[][], radius, isChina))
  } else if (geometry.type === 'MultiLineString') {
    for (const line of geometry.coordinates) {
      lines.push(createLineFromCoords(line as number[][], radius, isChina))
    }
  }

  return lines
}

// Create filled polygon geometry for China provinces
function createFilledPolygon(
  coords: number[][],
  radius: number
): THREE.Vector3[] {
  const r = radius + LINE_HEIGHT * 1.5
  return coords.map(coord => {
    const [lon, lat] = coord
    return latLonToVector3(lat, lon, r)
  })
}

function Globe() {
  const globeRef = useRef<THREE.Group>(null)

  // Auto-rotate slowly
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.05
    }
  })

  // Process world countries (excluding China)
  const worldLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []
    const features = (worldData as FeatureCollection).features || []

    for (const feature of features) {
      const props = feature.properties as { name?: string; NAME?: string; ADMIN?: string }
      const name = props?.name || props?.NAME || props?.ADMIN || ''

      // Skip China - we'll render it separately with provinces
      if (name === 'China' || name === 'CHN' || name === '中国') {
        continue
      }

      if (feature.geometry) {
        const featureLines = processGeometry(feature.geometry, GLOBE_RADIUS, false)
        lines.push(...featureLines)
      }
    }

    return lines
  }, [])

  // Process China provinces
  const chinaLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []
    const features = (chinaData as FeatureCollection).features || []

    for (const feature of features) {
      if (feature.geometry) {
        const featureLines = processGeometry(feature.geometry, GLOBE_RADIUS, true)
        lines.push(...featureLines)
      }
    }

    return lines
  }, [])

  return (
    <group ref={globeRef}>
      {/* Globe sphere - dark base */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* World countries borders - green lines */}
      {worldLines.map((points, i) => (
        <line key={`world-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff00" opacity={0.6} transparent />
        </line>
      ))}

      {/* China provinces borders - brighter green lines */}
      {chinaLines.map((points, i) => (
        <line key={`china-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff88" linewidth={2} />
        </line>
      ))}

      {/* China highlight glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.15, 32, 32]} />
        <meshBasicMaterial color="#00ff44" opacity={0.1} transparent />
      </mesh>
    </group>
  )
}

export default Globe
