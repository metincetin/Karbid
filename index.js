var fs = require('fs')
exports.options = {
	jsPath:__dirname+"/src/karbid.js",
	vars: "window"
}

exports.render = function(code,data){
	return  `
		<head><!--karbid--><script>${fs.readFileSync(this.options.jsPath)}</script></head>
		<body></body>
		<script>
			var p =
			${
				function(){
						var r = "";
						r = JSON.stringify(data)
						return r;
				}()
			}

			if(p!=undefined){
				Object.keys(p).forEach(function(i){
					${this.options.vars}[i] = p[i];
				})
			}

			karbid.render(\`${code}\`)
		</script>
	`;
}
exports.renderFile = function(path,data){
	return this.render (fs.readFileSync(path),data)
}
