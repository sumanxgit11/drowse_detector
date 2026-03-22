from flask import Flask, render_template

app = Flask(__name__)

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return render_template("home.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n  Drowsiness Detector Web Server starting...")
    print("  Serving frontend UI (MediaPipe runs in browser)")
    print("   Open http://127.0.0.1:5000 in your browser\n")
    app.run(debug=False, host="0.0.0.0", port=5000)
