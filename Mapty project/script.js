'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const option = document.querySelectorAll('.option')

class Workout{
    clicks = 0
    date = new Date()
    id = (Date.now() + '').slice(-10)
    constructor(distance , duration, coords){
        this.distance = distance; //in km
        this.duration = duration; //in min
        this.coords = coords; //[latitude , longitude]
    }

    _setDescription(){
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click(){
        this.clicks++;
    }
}

class Running extends Workout{
    type = 'running'
    constructor(distance , duration , coords , cadence){
        super(distance , duration , coords)
        this.cadence = cadence
        this.calcPace()
        this._setDescription()
    }
    
    calcPace(){
        this.pace = (this.duration / this.distance).toFixed(2)
        return this.pace
    }

}
class Cycling extends Workout{
    type = 'cycling'
    constructor(distance , duration , coords , elevationGain){
        super(distance , duration , coords)
        this.elevationGain = elevationGain
        this.calcSpeed()
        this._setDescription()
    }

    calcSpeed(){
        this.speed = (this.distance / this.duration).toFixed(2)
        return this.speed
    }
}


/////////////////////////////////////////
////// APPLICATION ARCHITECTURE//////////

class App{
    #map;
    #mapZoom = 13;
    #mapPosition;
    #workout = []
    
    constructor(){
        //Get position
        this._getPosition()

        //Get data from local storage
        this._getLocalStorageData();

        //Event listner
        form.addEventListener('submit' ,this._newWorkOut.bind(this))
        inputType.addEventListener('change' , this._toggleElevationField)
        containerWorkouts.addEventListener('click' , this._moveToPopup.bind(this))
    }

    _getPosition(){
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this) , function(){
            alert(`Can't get your current position`)
        })
    }

    _loadMap(position){

        const {latitude , longitude} = position.coords
       const coords = [latitude , longitude]
        // console.log(`https://www.google.com/maps/@${latitude},${longitude},15z?entry=ttu`)
        
        this.#map = L.map('map').setView(coords, this.#mapZoom);
        
        L.tileLayer('https://tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.#map);
        
        this.#map.on('click' ,this._showForm.bind(this))

        //This is here because we want to load our local storage after the map has been loaded
        this.#workout.forEach((wrk) => {
            this._renderWorkoutMarker(wrk)
        })

    }

    _showForm(mapP){
            this.#mapPosition = mapP;
            form.classList.remove('hidden')
            inputDistance.focus()
        }
        
    _hideForm(){
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = ''
        form.style.display = 'none'
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid'
        }, 1000)
    }

    _toggleElevationField(){
            option.forEach(function(el){
                el.classList.toggle('form__row--hidden')
            })
    }

    _newWorkOut(e){
        
            const validInputs = (...inputs) => inputs.every(inp => inp > 0)

            e.preventDefault()

            // Get values from all fields
            const type = inputType.value
            const distance = +inputDistance.value
            const duration = +inputDuration.value
            const {lat , lng} = this.#mapPosition.latlng
            let newWorkout;

            
            // if runnning , create running object 
            if(type === 'running'){
                const cadence = +inputCadence.value
                
                // console.log(type , distance , duration , cadence)
                
                //Validate all the inputs

                if(!validInputs(distance , duration , cadence)){// !(distance > 0) || !(duration > 0) || !(cadence > 0)
                    return alert('Inputs must be positive numbers')
                }
                newWorkout = new Running(distance, duration , [lat , lng] , cadence)
                
            }            
            
            // if cycling , create cycling  object 
            if(type === 'cycling'){
                const elevation = +inputElevation.value
                if(!validInputs(distance , duration)){// !(distance > 0) || !(duration > 0) || !(cadence > 0)
                    return alert('Inputs must be positive numbers')
            }
                newWorkout = new Cycling(distance, duration , [lat , lng] , elevation)
            }            

            //Add new object to workout array 
            this.#workout.push(newWorkout);

            //Render workout as marker on map
            this._renderWorkoutMarker(newWorkout);

            //Render workout in list
            this._renderWorkout(newWorkout);
            
            //Clear input fields and hide form
            this._hideForm()

            //Store workouts in local storage
            this._setLocalStorage();
        }
        
    _renderWorkoutMarker(workOut){
        const date = new Date();
        L.marker(workOut.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose : false, 
            closeOnClick : false,
            className : `${workOut.type}-popup` 
        })
        ).setPopupContent(`${workOut.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workOut.description}`)
        .openPopup();
    }

    _renderWorkout(workOut){

            let html = `
                <li class="workout workout--${workOut.type}" data-id="${workOut.id}">
                    <h2 class="workout__title">${workOut.description}</h2>
                    <div class="workout__details">
                    <span class="workout__icon">${workOut.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                    <span class="workout__value">${workOut.distance}</span>
                    <span class="workout__unit">km</span>
                    </div>
                    <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workOut.duration}</span>
                    <span class="workout__unit">min</span>
                    </div>`

            if(workOut.type === 'running'){
                html += `
                    <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workOut.pace}</span>
                    <span class="workout__unit">min/km</span>
                    </div>
                    <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workOut.cadence}</span>
                    <span class="workout__unit">spm</span>
                    </div>
                </li>`
                }

            if(workOut.type === 'cycling'){
                html += `
                    <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workOut.speed}</span>
                    <span class="workout__unit">km/h</span>
                    </div>
                    <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workOut.elevationGain}</span>
                    <span class="workout__unit">m</span>
                    </div>
                </li>
                `
            }

            form.insertAdjacentHTML('afterend', html)
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout')
        if(!workoutEl) return
        const showWorkout = this.#workout.find(work => work.id === workoutEl.dataset.id)
        // showWorkout.coords
        this.#map.setView(showWorkout.coords, this.#mapZoom , {
            animate:true,
            pan:{
                duration :1,
            }
        });
        // showWorkout.click()

    }

    _setLocalStorage(){
        localStorage.setItem('workout' , JSON.stringify(this.#workout))
    }

    _getLocalStorageData(){
        const data = JSON.parse(localStorage.getItem('workout'))
        if(!data) return
        this.#workout = data

        this.#workout.forEach((wrk) => {
            this._renderWorkout(wrk)
        })

    }

    reset(){
        localStorage.removeItem('workout');


        location.reload()
    }
}
const app = new App()
