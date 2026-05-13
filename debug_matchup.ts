import { readFileSync } from 'fs';

async function test() {
  const url = "https://api.sleeper.app/v1/league/1257065753383800832/matchups/5"; // Try some week
  const res = await fetch(url);
  const data = await res.json();
  console.log("Matchup points:", data[0].points);
  console.log("Players array exists?", !!data[0].players);
  console.log("Players points map exists?", !!data[0].players_points);
}
test();
