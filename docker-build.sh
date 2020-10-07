IMG='registry.spin.nersc.gov/mynersc/mynersc:latest'
docker build -t $IMG . && docker push $IMG
