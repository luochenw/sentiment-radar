import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { FeatureCollection, Geometry, Position } from 'geojson'
import worldTopoData from '../data/world-110m.json'
import chinaGeoData from '../data/china.json'

const GLOBE_RADIUS = 1

interface RegionData {
  name: string
  nameCn?: string
  lines: [number, number, number][][]
  polygons: Position[][][]
  isChina: boolean
}

// Country name mapping (ID to name) - ISO 3166-1 numeric codes
const countryNames: Record<string, string> = {
  '004': 'Afghanistan / 阿富汗',
  '008': 'Albania / 阿尔巴尼亚',
  '012': 'Algeria / 阿尔及利亚',
  '016': 'American Samoa / 美属萨摩亚',
  '020': 'Andorra / 安道尔',
  '024': 'Angola / 安哥拉',
  '028': 'Antigua and Barbuda / 安提瓜和巴布达',
  '031': 'Azerbaijan / 阿塞拜疆',
  '032': 'Argentina / 阿根廷',
  '036': 'Australia / 澳大利亚',
  '040': 'Austria / 奥地利',
  '044': 'Bahamas / 巴哈马',
  '048': 'Bahrain / 巴林',
  '050': 'Bangladesh / 孟加拉国',
  '051': 'Armenia / 亚美尼亚',
  '052': 'Barbados / 巴巴多斯',
  '056': 'Belgium / 比利时',
  '064': 'Bhutan / 不丹',
  '068': 'Bolivia / 玻利维亚',
  '070': 'Bosnia and Herzegovina / 波黑',
  '072': 'Botswana / 博茨瓦纳',
  '076': 'Brazil / 巴西',
  '084': 'Belize / 伯利兹',
  '090': 'Solomon Islands / 所罗门群岛',
  '096': 'Brunei / 文莱',
  '100': 'Bulgaria / 保加利亚',
  '104': 'Myanmar / 缅甸',
  '108': 'Burundi / 布隆迪',
  '112': 'Belarus / 白俄罗斯',
  '116': 'Cambodia / 柬埔寨',
  '120': 'Cameroon / 喀麦隆',
  '124': 'Canada / 加拿大',
  '132': 'Cape Verde / 佛得角',
  '140': 'Central African Republic / 中非',
  '144': 'Sri Lanka / 斯里兰卡',
  '148': 'Chad / 乍得',
  '152': 'Chile / 智利',
  '156': 'China / 中国',
  '158': 'Taiwan / 台湾',
  '170': 'Colombia / 哥伦比亚',
  '174': 'Comoros / 科摩罗',
  '178': 'Congo / 刚果',
  '180': 'DR Congo / 刚果民主共和国',
  '188': 'Costa Rica / 哥斯达黎加',
  '191': 'Croatia / 克罗地亚',
  '192': 'Cuba / 古巴',
  '196': 'Cyprus / 塞浦路斯',
  '203': 'Czech Republic / 捷克',
  '204': 'Benin / 贝宁',
  '208': 'Denmark / 丹麦',
  '212': 'Dominica / 多米尼克',
  '214': 'Dominican Republic / 多米尼加',
  '218': 'Ecuador / 厄瓜多尔',
  '222': 'El Salvador / 萨尔瓦多',
  '226': 'Equatorial Guinea / 赤道几内亚',
  '231': 'Ethiopia / 埃塞俄比亚',
  '232': 'Eritrea / 厄立特里亚',
  '233': 'Estonia / 爱沙尼亚',
  '242': 'Fiji / 斐济',
  '246': 'Finland / 芬兰',
  '250': 'France / 法国',
  '262': 'Djibouti / 吉布提',
  '266': 'Gabon / 加蓬',
  '268': 'Georgia / 格鲁吉亚',
  '270': 'Gambia / 冈比亚',
  '275': 'Palestine / 巴勒斯坦',
  '276': 'Germany / 德国',
  '288': 'Ghana / 加纳',
  '296': 'Kiribati / 基里巴斯',
  '300': 'Greece / 希腊',
  '308': 'Grenada / 格林纳达',
  '320': 'Guatemala / 危地马拉',
  '324': 'Guinea / 几内亚',
  '328': 'Guyana / 圭亚那',
  '332': 'Haiti / 海地',
  '340': 'Honduras / 洪都拉斯',
  '348': 'Hungary / 匈牙利',
  '352': 'Iceland / 冰岛',
  '356': 'India / 印度',
  '360': 'Indonesia / 印度尼西亚',
  '364': 'Iran / 伊朗',
  '368': 'Iraq / 伊拉克',
  '372': 'Ireland / 爱尔兰',
  '376': 'Israel / 以色列',
  '380': 'Italy / 意大利',
  '384': 'Ivory Coast / 科特迪瓦',
  '388': 'Jamaica / 牙买加',
  '392': 'Japan / 日本',
  '398': 'Kazakhstan / 哈萨克斯坦',
  '400': 'Jordan / 约旦',
  '404': 'Kenya / 肯尼亚',
  '408': 'North Korea / 朝鲜',
  '410': 'South Korea / 韩国',
  '414': 'Kuwait / 科威特',
  '417': 'Kyrgyzstan / 吉尔吉斯斯坦',
  '418': 'Laos / 老挝',
  '422': 'Lebanon / 黎巴嫩',
  '426': 'Lesotho / 莱索托',
  '428': 'Latvia / 拉脱维亚',
  '430': 'Liberia / 利比里亚',
  '434': 'Libya / 利比亚',
  '440': 'Lithuania / 立陶宛',
  '442': 'Luxembourg / 卢森堡',
  '450': 'Madagascar / 马达加斯加',
  '454': 'Malawi / 马拉维',
  '458': 'Malaysia / 马来西亚',
  '462': 'Maldives / 马尔代夫',
  '466': 'Mali / 马里',
  '470': 'Malta / 马耳他',
  '478': 'Mauritania / 毛里塔尼亚',
  '480': 'Mauritius / 毛里求斯',
  '484': 'Mexico / 墨西哥',
  '492': 'Monaco / 摩纳哥',
  '496': 'Mongolia / 蒙古',
  '498': 'Moldova / 摩尔多瓦',
  '499': 'Montenegro / 黑山',
  '504': 'Morocco / 摩洛哥',
  '508': 'Mozambique / 莫桑比克',
  '512': 'Oman / 阿曼',
  '516': 'Namibia / 纳米比亚',
  '520': 'Nauru / 瑙鲁',
  '524': 'Nepal / 尼泊尔',
  '528': 'Netherlands / 荷兰',
  '540': 'New Caledonia / 新喀里多尼亚',
  '548': 'Vanuatu / 瓦努阿图',
  '554': 'New Zealand / 新西兰',
  '558': 'Nicaragua / 尼加拉瓜',
  '562': 'Niger / 尼日尔',
  '566': 'Nigeria / 尼日利亚',
  '578': 'Norway / 挪威',
  '586': 'Pakistan / 巴基斯坦',
  '591': 'Panama / 巴拿马',
  '598': 'Papua New Guinea / 巴布亚新几内亚',
  '600': 'Paraguay / 巴拉圭',
  '604': 'Peru / 秘鲁',
  '608': 'Philippines / 菲律宾',
  '616': 'Poland / 波兰',
  '620': 'Portugal / 葡萄牙',
  '624': 'Guinea-Bissau / 几内亚比绍',
  '626': 'Timor-Leste / 东帝汶',
  '630': 'Puerto Rico / 波多黎各',
  '634': 'Qatar / 卡塔尔',
  '642': 'Romania / 罗马尼亚',
  '643': 'Russia / 俄罗斯',
  '646': 'Rwanda / 卢旺达',
  '659': 'Saint Kitts and Nevis / 圣基茨和尼维斯',
  '662': 'Saint Lucia / 圣卢西亚',
  '670': 'Saint Vincent / 圣文森特',
  '678': 'Sao Tome and Principe / 圣多美和普林西比',
  '682': 'Saudi Arabia / 沙特阿拉伯',
  '686': 'Senegal / 塞内加尔',
  '688': 'Serbia / 塞尔维亚',
  '690': 'Seychelles / 塞舌尔',
  '694': 'Sierra Leone / 塞拉利昂',
  '702': 'Singapore / 新加坡',
  '703': 'Slovakia / 斯洛伐克',
  '704': 'Vietnam / 越南',
  '705': 'Slovenia / 斯洛文尼亚',
  '706': 'Somalia / 索马里',
  '710': 'South Africa / 南非',
  '716': 'Zimbabwe / 津巴布韦',
  '724': 'Spain / 西班牙',
  '728': 'South Sudan / 南苏丹',
  '729': 'Sudan / 苏丹',
  '732': 'Western Sahara / 西撒哈拉',
  '740': 'Suriname / 苏里南',
  '748': 'Eswatini / 斯威士兰',
  '752': 'Sweden / 瑞典',
  '756': 'Switzerland / 瑞士',
  '760': 'Syria / 叙利亚',
  '762': 'Tajikistan / 塔吉克斯坦',
  '764': 'Thailand / 泰国',
  '768': 'Togo / 多哥',
  '776': 'Tonga / 汤加',
  '780': 'Trinidad and Tobago / 特立尼达和多巴哥',
  '784': 'UAE / 阿联酋',
  '788': 'Tunisia / 突尼斯',
  '792': 'Turkey / 土耳其',
  '795': 'Turkmenistan / 土库曼斯坦',
  '800': 'Uganda / 乌干达',
  '804': 'Ukraine / 乌克兰',
  '807': 'North Macedonia / 北马其顿',
  '818': 'Egypt / 埃及',
  '826': 'United Kingdom / 英国',
  '834': 'Tanzania / 坦桑尼亚',
  '840': 'United States / 美国',
  '854': 'Burkina Faso / 布基纳法索',
  '858': 'Uruguay / 乌拉圭',
  '860': 'Uzbekistan / 乌兹别克斯坦',
  '862': 'Venezuela / 委内瑞拉',
  '882': 'Samoa / 萨摩亚',
  '887': 'Yemen / 也门',
  '894': 'Zambia / 赞比亚',
  '-99': 'Kosovo / 科索沃',
}

// Convert lat/lon to 3D coordinates on sphere
function latLonToXYZ(lat: number, lon: number, radius: number): [number, number, number] {
  const latRad = lat * (Math.PI / 180)
  const lonRad = lon * (Math.PI / 180)

  const x = radius * Math.cos(latRad) * Math.sin(lonRad)
  const y = radius * Math.sin(latRad)
  const z = radius * Math.cos(latRad) * Math.cos(lonRad)

  return [x, y, z]
}

// Point in polygon test (ray casting algorithm)
function pointInPolygon(point: [number, number], polygon: Position[]): boolean {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

// Check if point is in any of the polygons
function pointInMultiPolygon(point: [number, number], polygons: Position[][][]): boolean {
  for (const polygon of polygons) {
    if (polygon.length > 0 && pointInPolygon(point, polygon[0])) {
      let inHole = false
      for (let i = 1; i < polygon.length; i++) {
        if (pointInPolygon(point, polygon[i])) {
          inHole = true
          break
        }
      }
      if (!inHole) return true
    }
  }
  return false
}

// Create line points from coordinates
function createLineFromCoords(coords: Position[], radius: number): [number, number, number][] {
  const points: [number, number, number][] = []
  for (const coord of coords) {
    const [lon, lat] = coord
    points.push(latLonToXYZ(lat, lon, radius))
  }
  return points
}

// Process geometry
function processGeometry(geometry: Geometry, baseRadius: number, isChina: boolean): {
  lines: [number, number, number][][],
  polygons: Position[][][]
} {
  const lines: [number, number, number][][] = []
  const polygons: Position[][][] = []

  const radius = baseRadius + (isChina ? 0.003 : 0.002)

  if (geometry.type === 'Polygon') {
    polygons.push(geometry.coordinates)
    for (const ring of geometry.coordinates) {
      const linePoints = createLineFromCoords(ring, radius)
      if (linePoints.length > 1) {
        lines.push(linePoints)
      }
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      polygons.push(polygon)
      for (const ring of polygon) {
        const linePoints = createLineFromCoords(ring, radius)
        if (linePoints.length > 1) {
          lines.push(linePoints)
        }
      }
    }
  }

  return { lines, polygons }
}

// Tooltip component
function Tooltip({ name, position }: { name: string, position: THREE.Vector3 }) {
  return (
    <Html position={position} center style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#00ff88',
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        border: '1px solid #00ff88',
        boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {name}
      </div>
    </Html>
  )
}

function Globe() {
  const globeRef = useRef<THREE.Group>(null)
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<THREE.Vector3 | null>(null)

  useFrame((_, delta) => {
    // Auto-rotate when not hovering
    if (globeRef.current && !hoveredRegion) {
      globeRef.current.rotation.y += delta * 0.05
    }
  })

  // Process world countries from TopoJSON
  const worldRegions = useMemo(() => {
    const regions: RegionData[] = []
    try {
      const topo = worldTopoData as unknown as Topology<{ countries: GeometryCollection }>
      const geojson = topojson.feature(topo, topo.objects.countries) as FeatureCollection

      for (const feature of geojson.features) {
        if (feature.geometry) {
          const id = String(feature.id || '')
          if (id === '156') continue // Skip China

          const { lines, polygons } = processGeometry(feature.geometry, GLOBE_RADIUS, false)
          if (lines.length > 0) {
            regions.push({
              name: countryNames[id] || `Country ${id}`,
              lines,
              polygons,
              isChina: false
            })
          }
        }
      }
    } catch (e) {
      console.error('Error processing world data:', e)
    }
    return regions
  }, [])

  // Process China provinces from GeoJSON
  const chinaRegions = useMemo(() => {
    const regions: RegionData[] = []
    try {
      const geojson = chinaGeoData as FeatureCollection

      for (const feature of geojson.features) {
        if (feature.geometry) {
          const props = feature.properties as { name?: string }
          const { lines, polygons } = processGeometry(feature.geometry, GLOBE_RADIUS, true)
          if (lines.length > 0) {
            regions.push({
              name: props?.name || 'Unknown',
              nameCn: props?.name,
              lines,
              polygons,
              isChina: true
            })
          }
        }
      }
    } catch (e) {
      console.error('Error processing China data:', e)
    }
    return regions
  }, [])

  // Find region at given lat/lon
  const findRegionAtPoint = useCallback((lonLat: [number, number]): RegionData | null => {
    // Check China provinces first (they're on top)
    for (const region of chinaRegions) {
      if (pointInMultiPolygon(lonLat, region.polygons)) {
        return region
      }
    }
    // Then check world countries
    for (const region of worldRegions) {
      if (pointInMultiPolygon(lonLat, region.polygons)) {
        return region
      }
    }
    return null
  }, [chinaRegions, worldRegions])

  // Handle pointer move on globe sphere
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()

    if (!globeRef.current) return

    // 将世界坐标转换为 Globe group 的本地坐标
    const localPoint = globeRef.current.worldToLocal(e.point.clone())

    // 从本地坐标计算经纬度
    const radius = localPoint.length()
    const lat = Math.asin(localPoint.y / radius) * (180 / Math.PI)
    const lon = Math.atan2(localPoint.x, localPoint.z) * (180 / Math.PI)

    const lonLat: [number, number] = [lon, lat]
    const region = findRegionAtPoint(lonLat)

    if (region) {
      const regionName = region.nameCn || region.name
      setHoveredRegion(regionName)
      const tooltipPos = localPoint.normalize().multiplyScalar(GLOBE_RADIUS + 0.12)
      setTooltipPosition(tooltipPos)
    } else {
      setHoveredRegion(null)
      setTooltipPosition(null)
    }
  }, [findRegionAtPoint])

  const handlePointerOut = useCallback(() => {
    setHoveredRegion(null)
    setTooltipPosition(null)
  }, [])

  return (
    <group ref={globeRef}>
      {/* Invisible sphere for mouse interaction */}
      <mesh
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[GLOBE_RADIUS + 0.01, 64, 64]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Globe sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* World countries */}
      {worldRegions.map((region, i) => {
        const regionName = region.name
        const isHovered = hoveredRegion === regionName

        return (
          <group key={`world-${i}`}>
            {region.lines.map((points, j) => (
              <Line
                key={j}
                points={points}
                color={isHovered ? '#66ccff' : '#3399cc'}
                lineWidth={isHovered ? 2 : 1}
              />
            ))}
          </group>
        )
      })}

      {/* China provinces */}
      {chinaRegions.map((region, i) => {
        const regionName = region.nameCn || region.name
        const isHovered = hoveredRegion === regionName

        return (
          <group key={`china-${i}`}>
            {region.lines.map((points, j) => (
              <Line
                key={j}
                points={points}
                color={isHovered ? '#00ffcc' : '#00ff88'}
                lineWidth={isHovered ? 2 : 1.5}
              />
            ))}
          </group>
        )
      })}

      {/* Tooltip */}
      {hoveredRegion && tooltipPosition && (
        <Tooltip name={hoveredRegion} position={tooltipPosition} />
      )}
    </group>
  )
}

export default Globe
