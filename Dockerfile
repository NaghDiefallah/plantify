
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 6. Specify the command to run your app
CMD ["streamlit", "run", "app.py"]