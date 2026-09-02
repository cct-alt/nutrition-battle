// Fix the garbled iOS comment line in app.js
var fso = new ActiveXObject("Scripting.FileSystemObject");
var file = fso.OpenTextFile("C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js", 1, false, 0);
var lines = [];
while (!file.AtEndOfStream) {
    lines.push(file.ReadLine());
}
file.Close();

WScript.Echo("Total lines: " + lines.length);
WScript.Echo("Line 907: " + lines[906]);

// Fix line 907 (index 906)
lines[906] = "/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */";

var file = fso.OpenTextFile("C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js", 2, true, -1);
for (var i = 0; i < lines.length; i++) {
    file.WriteLine(lines[i]);
}
file.Close();
WScript.Echo("Done");