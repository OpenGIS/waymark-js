<script setup>
// onMounted(() => {
//   setTimeout(() => {
//     //Iterate over each .remark-highlight .token.comment element
//     document.querySelectorAll("span.token.comment").forEach((el) => {
//       // Add newline
//       el.innerHTML += "\n";
//     });
//   }, 200);
// });
</script>

<template>
  <main>
    <article>
      <ClientOnly>
        <Map />
      </ClientOnly>

      <ContentToc />

      <ContentDoc class="markdown-body">
        <template #not-found>
          <Map mapPath="/examples/viewer/404.html" />

          <h1>Not Found</h1>

          <p>The content you are looking for can not be found.</p>
        </template>
      </ContentDoc>

      <ContentNav />
    </article>
  </main>
</template>
