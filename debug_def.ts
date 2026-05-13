import { readFileSync } from 'fs';

async function test() {
  const playersDataRes = await fetch("https://api.sleeper.app/v1/players/nfl");
  const playersData = await playersDataRes.json();
  console.log("Player 11705 (DB):", playersData["11705"].fantasy_positions);
  console.log("Player 2393 (DE):", playersData["2393"].fantasy_positions);
}
test();
