<script setup lang="ts"></script>

<template>
  <nav class="navbar">
    <span class="navbar__brand">Cobranza Digital</span>

    <div class="navbar__links">
      <RouterLink to="/" exact-active-class="navbar__link--active" class="navbar__link">
        Home
      </RouterLink>
      <RouterLink
        id="tour-nav-plantillas"
        to="/plantillas"
        active-class="navbar__link--active"
        class="navbar__link"
      >
        Mis plantillas
      </RouterLink>
      <RouterLink
        id="tour-nav-factura"
        to="/facturas/nueva"
        active-class="navbar__link--active"
        class="navbar__link"
      >
        Factura
      </RouterLink>
    </div>

    <RouterLink to="/perfil" class="navbar__avatar" title="Mi perfil" aria-label="Mi perfil">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="8.5" r="3.4" />
        <path d="M4.8 19c1.2-3.4 4-5.2 7.2-5.2s6 1.8 7.2 5.2" stroke-linecap="round" />
      </svg>
    </RouterLink>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.navbar__brand {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.navbar__links {
  display: flex;
  gap: var(--space-6);
  flex: 1;
}

.navbar__link {
  position: relative;
  color: var(--color-ink-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: var(--space-1) 0;
}

.navbar__link:hover {
  color: var(--color-ink-soft);
}

.navbar__link--active {
  color: var(--color-ink);
}

.navbar__link--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -13px;
  height: 2px;
  background: var(--color-accent);
}

.navbar__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  color: var(--color-ink-muted);
}

.navbar__avatar svg {
  width: 18px;
  height: 18px;
}

.navbar__avatar:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@media (max-width: 640px) {
  .navbar {
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  .navbar__brand {
    display: none;
  }

  .navbar__links {
    gap: var(--space-4);
    overflow-x: auto;
  }

  .navbar__link {
    white-space: nowrap;
  }
}
</style>
