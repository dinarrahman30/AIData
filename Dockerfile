# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Expose the default Streamlit port (for documentation, though Cloud Run uses $PORT)
EXPOSE 8501

# Run the Streamlit application, using Cloud Run's dynamic $PORT environment variable
# If $PORT is not set (e.g., local development), it defaults to 8501
CMD sh -c "streamlit run app.py --server.port=${PORT:-8501} --server.address=0.0.0.0"
