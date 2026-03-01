module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({"static/": "."});
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "public"
    },
    passthroughFileCopy: true
  };
};
