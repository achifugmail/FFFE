console.log("Hello World!");

function toggleNav() {
    const navPane = document.getElementById('navPane');
    if (navPane.classList.contains('collapsed')) {
        navPane.classList.remove('collapsed');
    } else {
        navPane.classList.add('collapsed');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.self === window.top) {
        fetch('nav.html')
            .then(response => response.text())
            .then(data => {
                document.getElementById('navContainer').innerHTML = data;
                document.getElementById('navContainer').style.display = 'block';
            });
    }
});
