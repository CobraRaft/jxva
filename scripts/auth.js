const navbar = document.getElementById("navbar");
const savedUser = localStorage.getItem("jxvaUser");

function renderNavbar(user) {
  navbar.innerHTML = `
    <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" class="avatar" />
    <a class="btn" href="/dashboard.html">Dashboard</a>
    <button class="btn" id="logout-btn">Logout</button>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("jxvaUser");
    window.location.href = "/";
  });
}

if (savedUser) renderNavbar(JSON.parse(savedUser));
