import { readFileSync } from 'fs';

async function test() {
  const res = await fetch("https://api.sleeper.app/v1/league/1257065753383800832");
  const data = await res.json();
  console.log("Roster positions:", data.roster_positions);
}
test();
