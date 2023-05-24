// Different python framework repos for demo purposes
export const frameworks: any = {
  django: {
    branch: "django",
    port: "8000",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "gunicorn sampleapi.wsgi",
  },
  flask: {
    branch: "flask",
    port: "8000",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "python server.py",
  },
  fast: {
    // Image is built off of https://github.com/shafkevi/simple-python-api fast branch
    imageUri: "public.ecr.aws/shafkevi/simple-python-api:fastapi",
    branch: "fast",
    port: "8000",
    buildCommand: "pip install -r requirements.txt",
    startCommand: "uvicorn server:app --host=0.0.0.0 --port=8000",
  },
} 