<template>
  <div v-if="isLoggedIn">
    <nav class="navbar">
      <div class="navbar-placeholder"></div>

      <div class="dropdown">
        <button class="dropdown-toggle" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
          {{ user?.email }} <i class="fas fa-caret-down"></i>
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <li><router-link to="/profile" class="dropdown-item">Profile</router-link></li>
          <li v-if="user?.rank > 0"><router-link to="/students" class="dropdown-item">Students</router-link></li>
          <li><router-link to="/logout" class="dropdown-item logout">Logout</router-link></li>
        </ul>
      </div>
    </nav>
  </div>
  <router-view></router-view>
</template>

<script>

import store from "@/store";

export default {
  name: 'App',
  computed: {
    isLoggedIn() {
      return store.state.auth.isAuthenticated;
    },
    user() {
      return store.state.auth.user;
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Montserrat&display=swap');

:root {
  --bg: #111111; /* Background color */
  --icons: #5109ac; /* Icon color */
  --input-text: #FFFFFF; /* Input text color */
  --active-input: #212021; /* Active input background color */
  --inactive-input: #171717; /* Inactive input background color */
  --label: #363636; /* Label text color */
  --button-active: #5c05cb;
}

::before, ::after, * {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

html, body {
  font-family: 'Montserrat', sans-serif;
  height: 100%;
  width: 100%;
}

#app {
  height: 100%;
  width: 100%;
  background-color: var(--bg);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #0a0a0a;
}

.navbar-placeholder {
  flex-grow: 1;
}

.dropdown {
  position: relative;
  display: inline-block;
  float: right;
}

.dropdown-menu {
  display: none;
  position: absolute;
  right: 0;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;
  list-style-type: none;
  padding: 0;
  transition: opacity 0.5s linear, visibility 0.5s linear;
}

.dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
}

.dropdown-menu li {
  padding: 2px 6px;
}

.dropdown-menu a {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-toggle {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
}

.logout {
  color: red !important;
}
</style>
