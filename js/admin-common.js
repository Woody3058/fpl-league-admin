
let DebugArgs = true;
let DebugPlayerImport = true;

function debugLog(...args) {
        console.log(...args);
}

function debugLogArgs(...args) {
    if (DebugArgs) {
        console.log(...args);
    }
}

function debugLogPlayerImport(...args) {
    if (DebugPlayerImport) {
        console.log(...args);
    }
}

async function requireAdminLogin() {

    console.log("admin-common.js: requireAdminLogin Called");

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

async function logoutAdmin() {

    console.log("admin-common.js: logoutAdmin Called");

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";
}

function setupAdminLogout() {

    console.log("admin-common.js: setupAdminLogout Called");

    const button = document.getElementById("logoutButton");

    if (!button)
        return;

    button.addEventListener("click", logoutAdmin);
}

function setActiveAdminNavigation(page) {

    console.log("admin-common.js: setActiveAdminNavigation Called");

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