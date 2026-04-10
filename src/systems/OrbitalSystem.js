// OrbitalSystem — advances all planet and moon angles each frame
// TIME_SCALE: 1 real second = DAYS_PER_SECOND simulated days
// At 8 days/sec, Earth (365 day orbit) completes one revolution in ~45 real seconds

const DAYS_PER_SECOND = 8;
const TWO_PI = Math.PI * 2;

export class OrbitalSystem {
  constructor(planets) {
    this.planets = planets;
  }

  update(delta) {
    const dtSeconds = delta / 1000;
    const daysElapsed = DAYS_PER_SECOND * dtSeconds;

    for (const planet of this.planets) {
      // Advance planet orbit angle
      planet.orbitAngle += (TWO_PI / planet.data.orbitalPeriod) * daysElapsed;

      // Update planet container position
      const px = Math.cos(planet.orbitAngle) * planet.data.orbitRadius;
      const py = Math.sin(planet.orbitAngle) * planet.data.orbitRadius;
      planet.container.setPosition(px, py);

      // Advance each moon within the planet container (local coords)
      for (const moon of planet.moons) {
        moon.orbitAngle += (TWO_PI / moon.data.orbitalPeriod) * daysElapsed;

        const mx = Math.cos(moon.orbitAngle) * moon.data.orbitRadius;
        const my = Math.sin(moon.orbitAngle) * moon.data.orbitRadius;

        moon.body.setPosition(mx, my);
        moon.glow.setPosition(mx, my);
        moon.label.setPosition(mx, my - moon.data.radius - 7);
      }
    }
  }
}
