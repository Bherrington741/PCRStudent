# Use a lightweight Nginx image as the base
FROM nginx:alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy your static website files to the Nginx webroot directory
COPY ./index.html /usr/share/nginx/html/
COPY ./pcr_form.html /usr/share/nginx/html/
COPY ./style.css /usr/share/nginx/html/
COPY ./script.js /usr/share/nginx/html/
COPY ./auth.js /usr/share/nginx/html/
# If you have an images folder, uncomment and adjust the line below
# COPY ./images /usr/share/nginx/html/images/

# Expose port 80 (Nginx default HTTP port)
EXPOSE 80

# Command to run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]