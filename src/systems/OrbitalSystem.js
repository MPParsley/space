// OrbitalSystem — advances all planet and moon angles each frame
//
// Planets use true elliptical orbits (Kepler parametric form):
//   x = a·cos(θ) − c     y = b·sin(θ)
// where a = semi-major axis (orbitRadius), e = eccentricity,
//       b = a·√(1−e²) (semi-minor axis), c = a·e (focal offset)
// The Sun sits at one focus (world origin).
//
// TIME_SCALE: 1 real second = DAYS_PER_SECOND simulated days
// At 8 days/s, Earth (365 day orbit) completes one revolution in ~45 real seconds.
//
// Moons use a separate, much smaller time scale. MAX_MOON_OMEGA enforces a
// minimum orbital period so even Phobos (0.32 d) and Enceladus (1.37 d) are
// watchable rather than a blur.
//
// At these settings:
//   Phobos / Io / Enceladus / Miranda  →  ~20 s / orbit  (capped)
//   Europa                             →  ~24 s / orbit
//   Triton                             →  ~39 s / orbit
//   Ganymede / Titania                 →  ~48–58 s / orbit
//   Titan / Callisto                   →  ~1.8 min / orbit
//   Earth's Moon                       →  ~3 min / orbit

const DAYS_PER_SECOND = 8;
const MOON_DAYS_PER_SECOND = 0.15;
const MAX_MOON_OMEGA = (Math.PI * 2) / 20; // rad/s → 20-second minimum orbital period
const TWO_PI = Math.PI * 2;

export class OrbitalSystem {
  constructor(planets) {
    this.planets = planets;
  }

  update(delta) {
    const dt = delta / 1000;

    for (const planet of this.planets) {
      const { orbitRadius: a, orbitalPeriod, eccentricity: e = 0 } = planet.data;

      // Advance eccentric anomaly (good enough for circular/near-circular orbits)
      planet.orbitAngle += (TWO_PI / orbitalPeriod) * DAYS_PER_SECOND * dt;

      // Ellipse parameters
      const b = a * Math.sqrt(1 - e * e); // semi-minor axis
      const c = a * e;                    // focal offset (Sun at origin)

      planet.container.setPosition(
        a * Math.cos(planet.orbitAngle) - c,
        b * Math.sin(planet.orbitAngle),
      );

      // Moons — circular orbits relative to parent planet container
      for (const moon of planet.moons) {
        const omega = Math.min(
          (TWO_PI / moon.data.orbitalPeriod) * MOON_DAYS_PER_SECOND,
          MAX_MOON_OMEGA,
        );
        moon.orbitAngle += omega * dt;

        const mx = Math.cos(moon.orbitAngle) * moon.data.orbitRadius;
        const my = Math.sin(moon.orbitAngle) * moon.data.orbitRadius;
        moon.body.setPosition(mx, my);
        moon.glow.setPosition(mx, my);
        moon.label.setPosition(mx, my - moon.data.radius - 7);
      }
    }
  }
}
