
async function requireLogin() {

    console.log("admin-common.js: requireLogin Called");

    const {data, error} = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
        window.location.href = "index.html";
        return false;
    }

    if (!data.session) {window.location.href = "index.html";
        return false;
    }
    return true;
}

async function logout() {

    console.log("admin-common.js: logout Called");

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";
}

function setupLogout() {

    console.log("admin-common.js: setupLogout Called");

    const button = document.getElementById("logoutButton");

    if (!button)
        return;

    button.addEventListener("click", logout);
}

function setActiveNavigation(page) {

    console.log("admin-common.js: setActiveNavigation Called");

    const links = {
        scores:
            document.getElementById("scoresNavLink"),
        chips:
            document.getElementById("chipsNavLink"),
        players:
            document.getElementById("playersNavLink"),
        seasons:
            document.getElementById("seasonsNavLink"),
        prizes:
            document.getElementById("prizesNavLink")
    };

    Object.values(links)
        .forEach(link => {
                if (link) {
                    link.classList.remove("admin-nav-active");
                }
            }
        );

    if (links[page]) {
        links[page].classList.add("admin-nav-active");
    }

}