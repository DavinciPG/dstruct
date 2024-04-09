<template>
  <router-view></router-view>
</template>

<script>

export default {
  name: 'App'
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
  height: 100vh;
  width: 100vw;
}

#app {
  height: inherit;
  width: inherit;
}
</style>
