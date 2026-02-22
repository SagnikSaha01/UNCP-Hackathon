from fastapi import FastAPI

app = FastAPI(title="UNCP Hackathon API")


@app.get("/")
def root():
    return {"message": "UNCP Hackathon API"}


@app.get("/health")
def health():
    return {"status": "ok"}
