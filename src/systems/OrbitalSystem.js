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
// Moons use a separate, much smaller time scale so that fast inner moons
// (Phobos 0.32 d, Enceladus 1.37 d) are still visibly orbital rather than
// a blur. MAX_MOON_OMEGA caps angular speed so no moon orbits faster than
// once every 2 real seconds.

const DAYS_PER_SECOND = 8;
const MOON_DAYS_PER_SECOND = 1.5;
const MAX_MOON_OMEGA = Math.PI; // rad/s → 2-second minimum orbital period
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
