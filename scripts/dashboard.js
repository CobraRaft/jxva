const user = JSON.parse(localStorage.getItem("jxvaUser"));
const guildsContainer = document.getElementById("guilds");
const welcomeText = document.getElementById("welcome");

if (!user) {
  window.location.href = "/";
} else {
  welcomeText.textContent = `Welcome, ${user.username}!`;
}

async function fetchGuilds() {
  try {
    const res = await fetch(`https://jxva.katabump.com/api/user-guilds?user_id=${user.id}`);
    const guilds = await res.json();

    guildsContainer.innerHTML = guilds.map(g => `
      <div style="background:#161620; padding:20px; border-radius:15px; width:220px;">
        <img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64" style="border-radius:8px; margin-bottom:10px;" />
        <h3>${g.name}</h3>
        <a href="#" class="btn" onclick="openGuild('${g.id}')">Manage</a>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error fetching guilds:", err);
  }
}

function openGuild(id) {
  window.location.href = `/guild.html?id=${id}`;
}

fetchGuilds();
