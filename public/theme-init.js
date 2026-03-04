(function() {
  var t = localStorage.getItem('noctivault-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try {
    var a = JSON.parse(localStorage.getItem('noctivault-accent') || '{}');
    if (a.color) {
      document.documentElement.style.setProperty('--accent', a.color);
      document.documentElement.style.setProperty('--accent-hover', a.hover);
      document.documentElement.style.setProperty('--accent-rgb', a.rgb);
    }
  } catch(e) {}
})();
