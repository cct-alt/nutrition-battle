var fso = new ActiveXObject("Scripting.FileSystemObject");
var file = fso.OpenTextFile("C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js", 1, false, 0);
var lines = [];
while (!file.AtEndOfStream) {
    lines.push(file.ReadLine());
}
file.Close();

WScript.Echo("Total lines: " + lines.length);

// Find the line with iOS comment
for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("iOS") >= 0 && lines[i].indexOf("??") >= 0) {
        WScript.Echo("Found garbled line at: " + (i+1));
        lines[i] = "/* ---------- 防止 iOS 雙擊縮放/長按選字 ---------- */";
        break;
    }
}

var file = fso.OpenTextFile("C:\\Users\\cct\\Documents\\Default Project\\nutrition-battle\\public\\app.js", 2, true, -1);
for (var i = 0; i < lines.length; i++) {
    file.WriteLine(lines[i]);
}
file.Close();
WScript.Echo("Done");