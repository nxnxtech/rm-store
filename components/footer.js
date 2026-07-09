function getFooterComponentHtml(pagePrefix) {
  return `
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="logo">
        <img src="assets/rm-logo.jpg" alt="RM Logo" style="width: 60px; height: 50px; border-radius: 10px; float: right;">
        Roger McDaniels</div>
        <p>Not for <strong>EVERYONE</strong>.</p>
        <div class="footer-social">
          <a href="https://wa.em/233599505817" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.85.505 3.66 1.46 5.24L2 22l4.9-1.416A9.958 9.958 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.13a8.108 8.108 0 01-4.13-1.13l-.296-.176-3.045.88.86-2.968-.192-.305A8.107 8.107 0 013.87 12c0-4.484 3.648-8.13 8.131-8.13 4.483 0 8.13 3.646 8.13 8.13 0 4.484-3.647 8.13-8.13 8.13z"/></svg></a>
          <a href="https://www.instagram.com/rmthefashionkeen?igsh=Znl3MGVhYWwweWdr" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
          <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg></a>
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Shop</h4>
        <ul>
          <li><a href="${pagePrefix}shop.html">All Products</a></li>
          <li><a href="${pagePrefix}new-arrivals.html">New Arrivals</a></li>
          <li><a href="${pagePrefix}shop.html?category=men">Men</a></li>
          <li><a href="${pagePrefix}shop.html?category=women">Women</a></li>
          <li><a href="${pagePrefix}shop.html?category=accessories">Accessories</a></li>
        </ul>
      </div>
      <!--<div class="footer-col">
        <h4>Company</h4>
        <ul>
          <li><a href="${pagePrefix}about.html">RM</a></li>
          <li><a href="${pagePrefix}collections.html">Collections</a></li>
          <li><a href="${pagePrefix}contact.html">Contact</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Press</a></li>
        </ul>
      </div>-->
      <div class="footer-col">
        <h4>Support</h4>
        <ul>
          <li><a href="../pages/contact.html">Contact</a></li>
          <!--<li><a href="#">FAQ</a></li>
          <li><a href="#">Shipping</a></li>
          <li><a href="#">Returns</a></li>
          <li><a href="#">Size Guide</a></li>
          <li><a href="#">Privacy Policy</a></li>-->
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; <span id="year"></span> Roger McDaniels. All rights reserved.</p>
      <p>Designed by <a href="https://nxnx.tech" target="_blank"><u>NxNx Tech</u></a>.</p>
    </div>
  </div>
</footer>
  `;
}

function loadFooterComponent() {
  const mount = document.getElementById('footer-placeholder');
  if (!mount) return;

  const isInPagesFolder = window.location.pathname.includes('/pages/');
  const pagePrefix = isInPagesFolder ? '' : 'pages/';

  mount.innerHTML = getFooterComponentHtml(pagePrefix);
  document.getElementById('year').textContent = new Date().getFullYear();
}
