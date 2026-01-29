import { reactive, ref } from "vue";
import { describe, it, expect } from "vitest";

class MyClass {
    constructor() {
        this.id = "123";
    }
}

describe("Reactivity Debug", () => {
    it("instanceof works with reactive", () => {
        const instance = new MyClass();
        const reactiveInstance = reactive(instance);
        
        console.log("Original instanceof:", instance instanceof MyClass);
        console.log("Reactive instanceof:", reactiveInstance instanceof MyClass);
        
        expect(reactiveInstance).toBeInstanceOf(MyClass);
    });

    it("Map with reactive objects", () => {
        const mapRef = ref(new Map());
        const item = reactive(new MyClass());
        
        mapRef.value.set(item.id, item);
        
        console.log("Map size:", mapRef.value.size);
        expect(mapRef.value.size).toBe(1);
        expect(mapRef.value.get("123")).toBe(item);
    });
});
