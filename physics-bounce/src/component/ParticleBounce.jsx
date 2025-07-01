import { useLayoutEffect, useRef } from "react";
import Matter from "matter-js";

function ParticleBounce({ elementRefs, children }) {
    const containerRef = useRef(null);

    const BODY_OPTIONS = {
        restitution: 1,
        density: 0.01,
        friction: 0.1,
        frictionAir: 0.02,
        render: { visible: false },
    };

    const WALL_OPTIONS = {
        isStatic: true,
        label: "wall",
        restitution: 1, // high bounciness
        friction: 0,
        render: {
            visible: false,
        },
    };

    const WALL_THICKNESS = 200;
    const WALL_PADDING = 10;

    const randomPosition = (margin, max) =>
        Matter.Common.random(margin, max - margin);

    const createRectangle = (el, width, height) => {
        var rectangleWidth = el.width;
        var rectangleHeight = el.height;

        const margin = el.width + 30; // safe margin from edges

        const x = randomPosition(margin, width);
        const y = randomPosition(margin, height);

        var rect = Matter.Bodies.rectangle(x, y, rectangleWidth, rectangleHeight, {
            ...BODY_OPTIONS,
            name: "box",
        });

        Matter.Body.setVelocity(rect, {
            x: Matter.Common.random(-1, 1),
            y: Matter.Common.random(-1, 1),
        });

        return rect;
    };

    function createBoundaries(width, height) {
        return [
            Matter.Bodies.rectangle(
                width / 2,
                height + WALL_THICKNESS / 2 - WALL_PADDING,
                width,
                WALL_THICKNESS,
                WALL_OPTIONS
            ), //bottom

            Matter.Bodies.rectangle(
                -WALL_THICKNESS / 2 + WALL_PADDING,
                height / 2,
                WALL_THICKNESS,
                height,
                WALL_OPTIONS
            ), // Left
            Matter.Bodies.rectangle(
                width + WALL_THICKNESS / 2 - WALL_PADDING,
                height / 2,
                WALL_THICKNESS,
                height,
                WALL_OPTIONS
            ), // Right
            Matter.Bodies.rectangle(
                width / 2,
                -WALL_THICKNESS / 2 + WALL_PADDING,
                width,
                WALL_THICKNESS,
                WALL_OPTIONS
            ), // Top
        ];
    }

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    useLayoutEffect(() => {
        const canvasContainer = containerRef.current;
        if (!canvasContainer) return;

        const isReady = elementRefs.current.every((ref) => ref?.current);
        if (!isReady) return;

        const getCanvasSize = () => ({
            width: canvasContainer?.offsetWidth,
            height: canvasContainer?.offsetHeight,
        });

        const engine = Matter.Engine.create({
            enableSleeping: true,
        });
        const world = engine.world;

        engine.positionIterations = 6;
        engine.velocityIterations = 4;
        engine.constraintIterations = 4;
        engine.gravity.y = 0.8;

        const render = Matter.Render.create({
            element: canvasContainer,
            engine,
            options: {
                ...getCanvasSize(),
                wireframes: false,
                background: "transparent",
            },
        });

        render.canvas.style.pointerEvents = "none";

        const runner = Matter.Runner.create();
        Matter.Render.run(render);
        Matter.Runner.run(runner, engine);

        let measuredSizes = elementRefs.current
            .map((ref) => {
                const el = ref.current;
                if (!el) return null;
                const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = el;
                return {
                    el,
                    width: offsetWidth,
                    height: offsetHeight,
                    left: offsetLeft,
                    top: offsetTop,
                };
            })
            .filter(Boolean);

        const createBodies = (width, height) =>
            measuredSizes.map((el) => createRectangle(el, width, height));

        const { width: w, height: h } = getCanvasSize();

        let bodiesStack = createBodies(w, h);
        Matter.Composite.add(world, bodiesStack);

        Matter.Composite.add(world, createBoundaries(w, h));

        // Mouse & Touch Handling
        const mouse = Matter.Mouse.create(canvasContainer);
        const mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false },
            },
        });
        Matter.Composite.add(world, mouseConstraint);
        render.mouse = mouse;

        let ticking = false;
        const updatePositions = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    bodiesStack.forEach((body, i) => {
                        const { el } = measuredSizes[i];
                        if (!el) return;
                        const x = body.position.x - el.offsetWidth / 2;
                        const y = body.position.y - el.offsetHeight / 2;
                        el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        };

        Matter.Events.on(engine, "afterUpdate", updatePositions);

        // Pause/resume engine on hover
        let isRunning = true;
        function pauseEngine() {
            if (isRunning) {
                Matter.Runner.stop(runner);
                isRunning = false;
            }
        }

        function resumeEngine() {
            if (!isRunning) {
                Matter.Runner.run(runner, engine);
                isRunning = true;
            }
        }

        canvasContainer.addEventListener("mouseleave", pauseEngine);
        canvasContainer.addEventListener("mouseenter", resumeEngine);

        // Custom touch/mouse interaction logic
        const getPointerPosition = (e) => {
            const rect = canvasContainer.getBoundingClientRect();
            if (e.touches) {
                const touch = e.touches[0] || e.changedTouches[0];
                return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
            }
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const isTouchingBody = (pos) => {
            const allBodies = Matter.Composite.allBodies(world);
            const touchedBodies = Matter.Query.point(allBodies, pos);
            return touchedBodies.some(body => body.name === "box");
        };

        let isDragging = false;

        const handleStart = (e) => {
            const pos = getPointerPosition(e);
            if (isTouchingBody(pos)) {
                e.preventDefault();
                mouseConstraint.mouse.mousedown(e);
                isDragging = true;
            }
        };

        const handleMove = (e) => {
            if (isDragging) {
                e.preventDefault();
                mouseConstraint.mouse.mousemove(e);
            }
        };

        const handleEnd = (e) => {
            if (isDragging) {
                e.preventDefault();
                mouseConstraint.mouse.mouseup(e);
                isDragging = false;
            }
        };


        // Attach custom events
        canvasContainer.addEventListener("mousedown", handleStart);
        canvasContainer.addEventListener("mousemove", handleMove);
        canvasContainer.addEventListener("mouseup", handleEnd);

        canvasContainer.addEventListener("touchstart", handleStart, { passive: false });
        canvasContainer.addEventListener("touchmove", handleMove, { passive: false });
        canvasContainer.addEventListener("touchend", handleEnd, { passive: false });

        // Remove default Matter mouse element listeners
        const mcEl = mouseConstraint.mouse.element;
        mcEl.removeEventListener("wheel", mouseConstraint.mouse.mousewheel);
        mcEl.removeEventListener("touchstart", mouseConstraint.mouse.mousedown);
        mcEl.removeEventListener("touchmove", mouseConstraint.mouse.mousemove);
        mcEl.removeEventListener("touchend", mouseConstraint.mouse.mouseup);

        const resizeCanvas = () => {
            const { width, height } = getCanvasSize();

            measuredSizes = elementRefs.current
                .map((ref) => {
                    const el = ref.current;
                    if (!el) return null;
                    const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = el;
                    return {
                        el,
                        width: offsetWidth,
                        height: offsetHeight,
                        left: offsetLeft,
                        top: offsetTop,
                    };
                })
                .filter(Boolean);

            // Clear the existing bodies
            Matter.Composite.clear(world, false);

            render.canvas.width = width;
            render.canvas.height = height;
            render.options.width = width;
            render.options.height = height;

            bodiesStack = createBodies(width, height);
            Matter.Composite.add(world, bodiesStack);

            Matter.Composite.add(world, createBoundaries(width, height));

            Matter.Composite.add(world, mouseConstraint);
        };

        const debouncedResize = debounce(resizeCanvas, 300)
        window.addEventListener("resize", debouncedResize)

        return () => {
            window.removeEventListener("resize", debouncedResize)

            canvasContainer.removeEventListener("mousedown", handleStart);
            canvasContainer.removeEventListener("mousemove", handleMove);
            canvasContainer.removeEventListener("mouseup", handleEnd);
            canvasContainer.removeEventListener("touchstart", handleStart);
            canvasContainer.removeEventListener("touchmove", handleMove);
            canvasContainer.removeEventListener("touchend", handleEnd);
            canvasContainer.removeEventListener("mouseleave", pauseEngine);
            canvasContainer.removeEventListener("mouseenter", resumeEngine);

            Matter.Events.off(engine, "afterUpdate", updatePositions);

            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            Matter.Composite.clear(world);
            Matter.Engine.clear(engine);
            Matter.Composite.clear(world);
            if (render.canvas.parentNode) {
                render.canvas.parentNode.removeChild(render.canvas);
            }
            render.canvas = null;
            render.context = null;
            render.mouse = null;
            render.textures = {};
        };
    }, [elementRefs]);

    return (
        <div
            className="w-full h-full relative pointer-events-auto overflow-hidden"
            ref={containerRef}
        >
            <div className="absolute inset-0 z-10 pointer-events-none">
                {children}
            </div>
        </div>
    );
}

export default ParticleBounce;
